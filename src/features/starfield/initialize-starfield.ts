import { generateStarfield } from './generate-star-field';
import { generateStarfieldBitmap } from './generate-starfield-bitmap';

/**
 * Makes the stars and draws the starfield's layers when there are none yet,
 * or the canvas has changed size since they were drawn.
 *
 * @param {number} canvasWidth - The canvas's width, in pixels.
 * @param {number} canvasHeight - The canvas's height, in pixels.
 * @returns {Promise<void>} When the layers are ready.
 *
 * @example
 * ```ts
 * await initializeStarfield(800, 600);
 * ```
 */
export const initializeStarfield = async (
  canvasWidth: number,
  canvasHeight: number
): Promise<void> => {
  if (
    !globalThis.STARFIELD_LAYERS?.length ||
    globalThis.LAST_CANVAS_SIZE.width !== canvasWidth ||
    globalThis.LAST_CANVAS_SIZE.height !== canvasHeight
  ) {
    globalThis.LAST_CANVAS_SIZE = { width: canvasWidth, height: canvasHeight };
    generateStarfield(canvasWidth, canvasHeight);
    await generateStarfieldBitmap(canvasWidth, canvasHeight);
  }
};
