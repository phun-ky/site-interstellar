import { DistanceInterface } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';

import { getFlatPosition } from './orbit-orientation';

export type GetBodyPositionReturnType = {
  x: DistanceInterface;
  y: DistanceInterface;
};

/**
 * Computes the **current position** of a celestial body relative to its parent, in real-world units.
 *
 * The position is determined from the body's `orbit`: its **semi-major axis** ($a$),
 * **eccentricity** ($e$) and **true anomaly** ($\nu$, `orbit.angle`), with the parent at
 * the focus:
 *
 * $$
 * r = \frac{a(1 - e^2)}{1 + e \cos\nu}
 * $$
 *
 * The orbit is laid flat and turned to its real direction by its node and
 * periapsis (see `getFlatPosition`, #105), with y flipped for the canvas, so
 * prograde orbits run counter-clockwise. On an open orbit, $a$ is negative and
 * the same formula holds.
 *
 * This lies on the curve `traceOrbit()` draws, at the point the true anomaly
 * gives. A body without an `orbit` (like the Sun inside the Solar System) sits
 * on its parent: `(0, 0)`.
 *
 * @param {OrbitingBodyType} body - The celestial body whose position is being calculated.
 * @returns {GetBodyPositionReturnType} The calculated position in **astronomical units (AU)**.
 *
 * @example
 * ```ts
 * import { PLANETS } from '@interstellar-tools/constants';
 *
 * const position = getBodyPosition(PLANETS[2]);
 * console.log(position); // { x: { value: ..., unit: 'au' }, y: { value: ..., unit: 'au' } }
 * ```
 */
export const getBodyPosition = (
  body: OrbitingBodyType
): GetBodyPositionReturnType => {
  const { orbit } = body;

  if (!orbit) {
    // A galaxy stays where its direction and distance put it
    if ('position' in body) return body.position;

    return { x: { value: 0, unit: 'au' }, y: { value: 0, unit: 'au' } };
  }

  const [x, y] = getFlatPosition(orbit);

  return { x: { value: x, unit: 'au' }, y: { value: y, unit: 'au' } };
};
