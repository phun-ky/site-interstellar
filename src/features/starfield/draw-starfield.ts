import { type StarfieldLayerIndexType } from './generate-star-field';
import { getLayerTransform } from './starfield-motion';

/** Each layer's repeating pattern, made once per tile. */
const patterns = new WeakMap<ImageBitmap, CanvasPattern>();

/**
 * Draws the starfield: its layers, far to near, each repeated across the
 * canvas, shifted and scaled by its share of the map's pan and zoom (see
 * `getLayerTransform()`), so near stars drift more than far ones.
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 * @param {number} canvasWidth - The canvas's width, in pixels.
 * @param {number} canvasHeight - The canvas's height, in pixels.
 *
 * @example
 * ```ts
 * drawStarfield(ctx, 800, 600);
 * ```
 */
export const drawStarfield = (
  space: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void => {
  const layers = globalThis.STARFIELD_LAYERS ?? [];

  space.save();

  layers.forEach((tile, index) => {
    const pattern = patterns.get(tile) ?? space.createPattern(tile, 'repeat');

    if (!pattern) return;

    patterns.set(tile, pattern);

    const { x, y, scale } = getLayerTransform(index as StarfieldLayerIndexType);
    const middleX = canvasWidth / 2;
    const middleY = canvasHeight / 2;
    // The tile has the screen's pixels, the canvas is drawn in CSS pixels
    const pixelRatio = tile.width / canvasWidth || 1;

    // Shifted within one tile, so long pans stay small numbers
    pattern.setTransform(
      new DOMMatrix()
        .translate(middleX + (x % canvasWidth), middleY + (y % canvasHeight))
        .scale(scale)
        .translate(-middleX, -middleY)
        .scale(1 / pixelRatio)
    );
    space.fillStyle = pattern;
    space.fillRect(0, 0, canvasWidth, canvasHeight);
  });

  space.restore();
};
