import { TWO_PI } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';
import { ValueInterface } from '@interstellar-tools/types';

import { MIN_BLACK_HOLE_SIZE } from '../../config/constants';
import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { type LabelCandidateType } from '../labels/utils/place-labels';

import { drawBlackHole } from './draw-galaxy';
import { type BlackHoleBodyType } from './utils/black-hole-bodies';
import { type GalaxyBodyType } from './utils/galaxy-bodies';
import { getBodyPosition } from './utils/get-body-position';
import { isInside } from './utils/is-inside-galaxy';

/** The radius of a galaxy's core dot, in pixels: what is clicked and pointed at. */
const CORE_SIZE = 3;
/** The distance between a galaxy's core and the bottom of its label, in pixels. */
const LABEL_GAP = 24;
/** How see-through a galaxy's disc is. */
const DISC_OPACITY = 0.08;

export type DrawGalaxiesPropsType = {
  space: CanvasRenderingContext2D;
  /** The Milky Way's centre on the canvas, in pixels: where the galaxies are placed from. */
  referenceX: number;
  referenceY: number;
  scale: ValueInterface;
  galaxies: GalaxyBodyType[];
  /** Their central black holes, each by its galaxy (its `parent`). */
  blackHoles?: BlackHoleBodyType[];
};

/** Whether a body is the one locked on (or looked at in the focus view). */
const isLocked = (id: string): boolean =>
  globalThis.LOCKED_CELESTIAL_BODY?.id === id;
/** Keeps a body where it is drawn on the canvas, for clicks and arrows. */
const track = (
  { id, name, category }: { id: string; name: string; category: string },
  x: number,
  y: number,
  size: number
): void => {
  globalThis.NEAREST_BODIES[id] = {
    id,
    x,
    y,
    size,
    name,
    category,
    parent: undefined
  };
};

/**
 * Draws the galaxies besides the Milky Way (#105): each a faint disc as wide
 * as the galaxy, round a small core dot. Only the core counts as the galaxy
 * on the canvas (in `globalThis.NEAREST_BODIES`), for clicks and arrows, so a
 * disc filling the view doesn't swallow every click.
 *
 * Inside a galaxy (its disc wider than the canvas), or locked on its black
 * hole, the core is its black hole instead: drawn as Sagittarius A* is
 * (`drawBlackHole()`), and
 * clicked, labelled and pointed at as itself. A galaxy still locked on from
 * there keeps its place too, behind the black hole, for its lock reticle.
 *
 * @param {DrawGalaxiesPropsType} props - The canvas, where the Milky Way's centre is, the scale, the galaxies and their black holes.
 * @returns {LabelCandidateType[]} A label for each galaxy, above its core, ranked by its size
 * in km, as other labels are.
 *
 * @example
 * ```ts
 * labels.push(...drawGalaxies({ space, referenceX, referenceY, scale, galaxies: GALAXY_BODIES }));
 * ```
 */
export const drawGalaxies = ({
  space,
  referenceX,
  referenceY,
  scale,
  galaxies,
  blackHoles = []
}: DrawGalaxiesPropsType): LabelCandidateType[] => {
  space.save();

  const labels = galaxies.map((galaxy) => {
    const { x, y } = getBodyPosition(galaxy);
    const xPX = referenceX + distanceToPixels(x, scale);
    const yPX = referenceY + distanceToPixels(y, scale);
    const radius = distanceToPixels(galaxy.radius, scale);
    const blackHole = blackHoles.find(({ parent }) => parent === galaxy.id);

    space.fillStyle = galaxy.display.color;

    if (radius > CORE_SIZE * 2) {
      space.globalAlpha = DISC_OPACITY;
      space.beginPath();
      space.arc(xPX, yPX, radius, 0, TWO_PI);
      space.fill();
      space.globalAlpha = 1;
    }

    if (
      blackHole &&
      (isInside(space, xPX, yPX, radius) || isLocked(blackHole.id))
    ) {
      const size = Math.max(
        distanceToPixels(blackHole.radius, scale),
        MIN_BLACK_HOLE_SIZE
      );

      // The black hole first: a click on the core finds it, not the galaxy
      track(blackHole, xPX, yPX, size);

      if (isLocked(galaxy.id)) track(galaxy, xPX, yPX, CORE_SIZE);

      drawBlackHole(space, xPX, yPX, size);

      return {
        id: blackHole.id,
        text: blackHole.name.toUpperCase(),
        x: xPX,
        y: yPX,
        bottom: yPX - size - LABEL_GAP,
        priority: isLocked(blackHole.id)
          ? Infinity
          : convertDistanceUnit(blackHole.radius, 'km').value
      };
    }

    track(galaxy, xPX, yPX, CORE_SIZE);
    space.beginPath();
    space.arc(xPX, yPX, CORE_SIZE, 0, TWO_PI);
    space.fill();

    return {
      id: galaxy.id,
      text: galaxy.name.toUpperCase(),
      x: xPX,
      y: yPX,
      bottom: yPX - CORE_SIZE - LABEL_GAP,
      priority: isLocked(galaxy.id)
        ? Infinity
        : convertDistanceUnit(galaxy.radius, 'km').value
    };
  });

  space.restore();

  return labels;
};
