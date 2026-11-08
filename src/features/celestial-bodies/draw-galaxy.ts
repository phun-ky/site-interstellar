import { GalaxyInterface, ValueInterface } from '@interstellar-tools/types';

import { MAX_CELESTIAL_BODY_SIZE } from '../../config/constants';
import { distanceToPixels } from '../../utils/distance/distance-to-pixels';

export type DrawGalaxyPropsType = {
  space: CanvasRenderingContext2D;
  referenceX: number;
  referenceY: number;
  scale: ValueInterface;
  galaxy: GalaxyInterface;
  maxSize?: number;
};

/**
 * Renders a galaxy onto a 2D canvas by representing its central supermassive black hole.
 *
 * **Mathematical Explanation:**
 *
 * The **radius** of the black hole in pixels is determined using:
 * $$
 * r_{px} = \max(\text{scaled radius}, \text{maxSize})
 * $$
 * ensuring a **minimum renderable size** for visibility.
 *
 * The galactic center is visually depicted as a circular region.
 *
 * @param {DrawGalaxyPropsType} props - Object containing rendering parameters.
 * @param {CanvasRenderingContext2D} props.space - The 2D rendering context of the canvas.
 * @param {number} props.referenceX - The x-coordinate of the galactic center in pixels.
 * @param {number} props.referenceY - The y-coordinate of the galactic center in pixels.
 * @param {ValueInterface} props.scale - The scale factor converting real-world units to pixels.
 * @param {GalaxyInterface} props.galaxy - The galaxy data, including its black hole radius.
 * @param {number} [props.maxSize=MAX_CELESTIAL_BODY_SIZE] - The maximum size of the black hole render in pixels.
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
    maxSize = MAX_CELESTIAL_BODY_SIZE
  } = props;

  // A galaxy without a known black hole (Triangulum) has no centre to draw
  if (!galaxy.blackHole) return;

  const { radius } = galaxy.blackHole;
  const galaxySize = Math.max(distanceToPixels(radius, scale), maxSize);

  space.fillStyle = 'white';
  space.beginPath();
  space.arc(referenceX, referenceY, galaxySize, 0, Math.PI * 2);
  space.fill();
};
