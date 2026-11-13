import { GalaxyInterface, ValueInterface } from '@interstellar-tools/types';

import { MIN_BLACK_HOLE_SIZE } from '../../config/constants';
import { distanceToPixels } from '../../utils/distance/distance-to-pixels';

/**
 * From this drawn radius, in pixels, a black hole is drawn as it is seen
 * (the EHT's images): a dark shadow inside a bright ring. Smaller, it is a
 * white dot, which a dark disc wouldn't show as.
 */
const SHADOW_FROM_PX = 16;
/** The bright ring's width, in pixels, and its glow's. */
const RING_WIDTH = 2;
const GLOW_WIDTH = 8;

/**
 * Draws a black hole: a white dot, or close up a dark shadow ringed by
 * light, as Sagittarius A* and M87* were imaged.
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 * @param {number} x - Its centre's x, in pixels.
 * @param {number} y - Its centre's y, in pixels.
 * @param {number} size - Its drawn radius, in pixels.
 *
 * @example
 * ```ts
 * drawBlackHole(space, 720, 418, 190);
 * ```
 */
export const drawBlackHole = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void => {
  space.save();
  space.beginPath();
  space.arc(x, y, size, 0, Math.PI * 2);

  if (size < SHADOW_FROM_PX) {
    space.fillStyle = 'white';
    space.fill();
    space.restore();

    return;
  }

  space.fillStyle = 'black';
  space.fill();
  space.strokeStyle = 'white';
  space.globalAlpha = 0.2;
  space.lineWidth = GLOW_WIDTH;
  space.stroke();
  space.globalAlpha = 1;
  space.lineWidth = RING_WIDTH;
  space.stroke();
  space.restore();
};

export type DrawGalaxyPropsType = {
  space: CanvasRenderingContext2D;
  referenceX: number;
  referenceY: number;
  scale: ValueInterface;
  galaxy: GalaxyInterface;
  minSize?: number;
};

/**
 * Renders a galaxy onto a 2D canvas by representing its central supermassive black hole.
 *
 * **Mathematical Explanation:**
 *
 * The **radius** of the black hole in pixels is determined using:
 * $$
 * r_{px} = \max(\text{scaled radius}, \text{minSize})
 * $$
 * ensuring a **minimum renderable size** for visibility.
 *
 * The galactic center is visually depicted as a circular region. The black
 * hole is kept in `globalThis.NEAREST_BODIES` where it is drawn, so it can
 * be clicked, locked on and pointed at, as any body.
 *
 * @param {DrawGalaxyPropsType} props - Object containing rendering parameters.
 * @param {CanvasRenderingContext2D} props.space - The 2D rendering context of the canvas.
 * @param {number} props.referenceX - The x-coordinate of the galactic center in pixels.
 * @param {number} props.referenceY - The y-coordinate of the galactic center in pixels.
 * @param {ValueInterface} props.scale - The scale factor converting real-world units to pixels.
 * @param {GalaxyInterface} props.galaxy - The galaxy data, including its black hole radius.
 * @param {number} [props.minSize=MIN_BLACK_HOLE_SIZE] - The smallest the black hole is drawn, in pixels.
 * @returns {void} This function does not return a value; it renders the galaxy onto the canvas.
 *
 * @example
 * ```ts
 * const galaxy: GalaxyInterface = {
 *   name: 'Milky Way',
 *   blackHole: { radius: { value: 0.08, unit: 'au' } }
 * };
 *
 * drawGalaxy({
 *   space: ctx,
 *   referenceX: 500,
 *   referenceY: 500,
 *   scale: { value: 50 },
 *   galaxy: galaxy
 * });
 * ```
 *
 * @see [Supermassive Black Holes](https://en.wikipedia.org/wiki/Supermassive_black_hole)
 */
export const drawGalaxy = (props: DrawGalaxyPropsType): void => {
  const {
    space,
    referenceX,
    referenceY,
    scale,
    galaxy,
    minSize = MIN_BLACK_HOLE_SIZE
  } = props;

  // A galaxy without a known black hole (Triangulum) has no centre to draw
  if (!galaxy.blackHole) return;

  const { radius } = galaxy.blackHole;
  const galaxySize = Math.max(distanceToPixels(radius, scale), minSize);

  drawBlackHole(space, referenceX, referenceY, galaxySize);

  if (galaxy.blackHole.id) {
    globalThis.NEAREST_BODIES[galaxy.blackHole.id] = {
      id: galaxy.blackHole.id,
      x: referenceX,
      y: referenceY,
      size: galaxySize,
      name: galaxy.blackHole.name,
      category: 'black hole',
      parent: undefined
    };
  }
};
