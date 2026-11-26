import {
  bodyOrientation,
  matMul3,
  rot1,
  transpose3
} from '@interstellar-tools/equations';

import type { OrbitingBodyType } from '../../../types/orbiting-bodies';

import { findBodyById, getBodyKind } from './body-catalog';
import {
  getEclipticPosition,
  OBLIQUITY,
  type Matrix3Type,
  type Vector3Type
} from './orbit-orientation';

/** How a globe sits in the view, and where its light comes from. */
export type GlobeOrientationType = {
  /** The rotation from the body-fixed frame into the view, by rows. */
  toView: Matrix3Type;
  /** The direction to the Sun in the view, of length 1. */
  sun: Vector3Type;
};

const ICRF_TO_ECLIPTIC = transpose3(rot1(OBLIQUITY));

/**
 * How far a body turns in one frame, in degrees, from its IAU rotation
 * model's daily turn of the prime meridian.
 *
 * @param {OrbitingBodyType} body - The body, with `rotation.iau`.
 * @param {number} daysPerFrame - The simulation's time step.
 * @returns {number} The turn per frame, or 0 without a rotation model.
 *
 * @example
 * ```ts
 * getSpinPerFrame(mars, 0.25); // 87.7: a quarter of Mars's 350.9° a day
 * ```
 */
export const getSpinPerFrame = (
  body: OrbitingBodyType,
  daysPerFrame: number
): number => {
  const iau = 'rotation' in body ? body.rotation?.iau : undefined;

  return iau ? Math.abs(iau.primeMeridianRate * daysPerFrame) : 0;
};

/**
 * Where a body is from its star, in au, in the J2000 ecliptic frame: its
 * orbit's position, plus its parent's, up to the star. A moon is lit from
 * where its planet is, not from its planet.
 */
const getPositionFromStar = (body: OrbitingBodyType): Vector3Type | null => {
  let position: Vector3Type = [0, 0, 0];

  for (
    let current: OrbitingBodyType | undefined = body;
    current && getBodyKind(current.id) !== 'star';
    current = findBodyById(current.parent)
  ) {
    const orbit = 'orbit' in current ? current.orbit : undefined;
    const step = orbit && getEclipticPosition(orbit);

    if (!step) return null;

    position = [
      position[0] + step[0],
      position[1] + step[1],
      position[2] + step[2]
    ];
  }

  return position;
};

/**
 * How a body's globe looks in the focus view at a moment. The view is the
 * map's: from above the ecliptic's north side, x to the right, y up and z
 * towards the viewer. The body turns by its IAU rotation model, and is lit
 * from its star, where its orbit, and its parents' orbits, put it.
 *
 * @param {OrbitingBodyType} body - The body, with `rotation.iau` and an `orbit`.
 * @param {Date} date - The moment, on or after 1972-01-01.
 * @returns {GlobeOrientationType | null} The orientation, or `null` without
 *   a rotation model, a placeable orbit or a date the model covers.
 *
 * @example
 * ```ts
 * const { toView, sun } = getGlobeOrientation(mars, SIMULATION_DATE)!;
 * applyMatrix(toView, [0, 0, 1]); // where Mars's north pole points
 * ```
 */
export const getGlobeOrientation = (
  body: OrbitingBodyType,
  date: Date
): GlobeOrientationType | null => {
  const iau = 'rotation' in body ? body.rotation?.iau : undefined;
  const position = iau && getPositionFromStar(body);
  const length = position ? Math.hypot(...position) : 0;

  if (!position || !length) return null;

  const [x, y, z] = position;

  try {
    const { matrix } = bodyOrientation(iau, date);

    return {
      toView: matMul3(ICRF_TO_ECLIPTIC, transpose3(matrix)),
      sun: [-x / length, -y / length, -z / length]
    };
  } catch {
    // The simulation has been run back before the models start
    return null;
  }
};
