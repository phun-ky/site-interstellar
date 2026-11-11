import { TWO_PI } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';
import { ValueInterface } from '@interstellar-tools/types';

import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { type LabelCandidateType } from '../labels/utils/place-labels';

import { type GalaxyBodyType } from './utils/galaxy-bodies';
import { getBodyPosition } from './utils/get-body-position';

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
};

/**
 * Draws the galaxies besides the Milky Way (#105): each a faint disc as wide
 * as the galaxy, round a small core dot. Only the core counts as the galaxy
 * on the canvas (in `globalThis.NEAREST_BODIES`), for clicks and arrows, so a
 * disc filling the view doesn't swallow every click.
 *
 * @param {DrawGalaxiesPropsType} props - The canvas, where the Milky Way's centre is, the scale and the galaxies.
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
  galaxies
}: DrawGalaxiesPropsType): LabelCandidateType[] => {
  space.save();

  const labels = galaxies.map((galaxy) => {
    const { x, y } = getBodyPosition(galaxy);
    const xPX = referenceX + distanceToPixels(x, scale);
    const yPX = referenceY + distanceToPixels(y, scale);
    const radius = distanceToPixels(galaxy.radius, scale);

    globalThis.NEAREST_BODIES[galaxy.id] = {
      id: galaxy.id,
      x: xPX,
      y: yPX,
      size: CORE_SIZE,
      name: galaxy.name,
      category: galaxy.category,
      parent: undefined
    };

    space.fillStyle = galaxy.display.color;

    if (radius > CORE_SIZE * 2) {
      space.globalAlpha = DISC_OPACITY;
      space.beginPath();
      space.arc(xPX, yPX, radius, 0, TWO_PI);
      space.fill();
      space.globalAlpha = 1;
    }

    space.beginPath();
    space.arc(xPX, yPX, CORE_SIZE, 0, TWO_PI);
    space.fill();

    return {
      id: galaxy.id,
      text: galaxy.name.toUpperCase(),
      x: xPX,
      y: yPX,
      bottom: yPX - CORE_SIZE - LABEL_GAP,
      priority:
        globalThis.LOCKED_CELESTIAL_BODY?.id === galaxy.id
          ? Infinity
          : convertDistanceUnit(galaxy.radius, 'km').value
    };
  });

  space.restore();

  return labels;
};
