import { GalaxyInterface, ValueInterface } from '@interstellar-tools/types';

import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import {
  CANVAS_COLORS,
  CANVAS_GALAXY_FONT,
  CANVAS_LABEL_FONT,
  setLabelLetterSpacing
} from '../canvas/config/ui';

import { type LabelBoxType } from './utils/place-labels';

export type DrawGalaxyLabelPropsType = {
  space: CanvasRenderingContext2D;
  referenceX: number;
  referenceY: number;
  galaxy: GalaxyInterface;
  scale: ValueInterface;
};

/**
 * Renders the name of a galaxy and its central black hole onto a 2D canvas.
 *
 * **Rendering Details:**
 * - The **galaxy name** is displayed above the black hole.
 * - The **black hole name** is displayed slightly lower.
 * - Labels are centered relative to the reference coordinates.
 * - The vertical spacing is determined dynamically by:
 * $$
 * y_{label} = referenceY - \text{distanceToPixels}(r, \text{scale}) - offset
 * $$
 * where:
 * - $r$ is the **radius of the black hole**.
 * - `offset` is a fixed value to ensure proper label separation.
 *
 * @param {DrawGalaxyLabelPropsType} props - Object containing rendering parameters.
 * @param {CanvasRenderingContext2D} props.space - The 2D rendering context of the canvas.
 * @param {number} props.referenceX - The x-coordinate of the galaxy center in pixels.
 * @param {number} props.referenceY - The y-coordinate of the galaxy center in pixels.
 * @param {GalaxyInterface} props.galaxy - The galaxy data, including its name and black hole.
 * @param {ValueInterface} props.scale - The scale factor converting real-world units to pixels.
 * @returns {void} This function does not return a value; it renders text labels onto the canvas.
 *
 * @example
 * ```ts
 * const galaxy: GalaxyInterface = {
 *   name: 'Milky Way',
 *   blackHole: { name: 'Sagittarius A*', radius: { value: 0.08, unit: 'au' } }
 * };
 *
 * drawGalaxyLabel({
 *   space: ctx,
 *   referenceX: 500,
 *   referenceY: 500,
 *   scale: { value: 50 },
 *   galaxy: galaxy
 * });
 * ```
 *
 * @see [Sagittarius A*](https://en.wikipedia.org/wiki/Sagittarius_A*)
 */
export const drawGalaxyLabel = (
  props: DrawGalaxyLabelPropsType
): LabelBoxType[] => {
  const { space, referenceX, referenceY, scale, galaxy } = props;
  const { name, blackHole } = galaxy;
  const boxes: LabelBoxType[] = [];
  /** The box a line of text, centred on x, takes with the current font. */
  const boxOf = (text: string, y: number): LabelBoxType => {
    const metrics = space.measureText(text);

    return {
      left: referenceX - metrics.width / 2,
      top: y - metrics.actualBoundingBoxAscent,
      width: metrics.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
  };

  // Without a known black hole there is no centre to label
  if (!blackHole) return boxes;

  const { radius } = blackHole;

  space.save();

  space.font = CANVAS_GALAXY_FONT;
  space.fillStyle = CANVAS_COLORS.teal;
  space.textAlign = 'center';

  const nameY = referenceY - distanceToPixels(radius, scale) - 56;

  space.fillText(name.toUpperCase(), referenceX, nameY);
  boxes.push(boxOf(name.toUpperCase(), nameY));

  space.restore();

  space.save();

  space.font = CANVAS_LABEL_FONT;
  setLabelLetterSpacing(space);
  space.fillStyle = CANVAS_COLORS.amber;
  space.textAlign = 'center';

  const blackHoleY = referenceY - distanceToPixels(radius, scale) - 24;

  space.fillText(blackHole.name.toUpperCase(), referenceX, blackHoleY);
  boxes.push(boxOf(blackHole.name.toUpperCase(), blackHoleY));

  space.restore();

  return boxes;
};
