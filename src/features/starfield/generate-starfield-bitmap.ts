import { TWO_PI } from '@interstellar-tools/constants';

import { starfield } from './config';
import { type StarfieldStarInterface } from './generate-star-field';

/** Draws a star, and again across any edge it touches, so the tile repeats seamlessly. */
const drawStar = (
  space: OffscreenCanvasRenderingContext2D,
  { x, y, size, color }: StarfieldStarInterface,
  width: number,
  height: number
): void => {
  const reach = size + 1;
  const xs = [x, x < reach ? x + width : x > width - reach ? x - width : null];
  const ys = [
    y,
    y < reach ? y + height : y > height - reach ? y - height : null
  ];

  space.fillStyle = color;

  for (const atX of xs) {
    for (const atY of ys) {
      if (atX === null || atY === null) continue;

      space.beginPath();
      space.arc(atX, atY, size, 0, TWO_PI);
      space.fill();
    }
  }
};

/**
 * Draws the starfield's layers, each on a tile as large as the canvas that
 * repeats seamlessly, so a layer can drift as the map pans and zooms (see
 * `drawStarfield()`). Keeps them in `globalThis.STARFIELD_LAYERS`, far
 * layer first. A tile has as many pixels as the screen shows, as the map's
 * canvas does, so stars smaller than a CSS pixel stay sharp on a
 * high-density screen.
 *
 * @param {number} width - The canvas's width, in CSS pixels.
 * @param {number} height - The canvas's height, in CSS pixels.
 * @param {number} [pixelRatio] - Screen pixels per CSS pixel; the screen's by default.
 * @returns {Promise<void>} When the layers are ready.
 *
 * @example
 * ```ts
 * await generateStarfieldBitmap(800, 600);
 * ```
 */
export const generateStarfieldBitmap = async (
  width: number,
  height: number,
  pixelRatio = globalThis.devicePixelRatio || 1
): Promise<void> => {
  const layers: ImageBitmap[] = [];

  for (const layer of [0, 1, 2]) {
    const tile = new OffscreenCanvas(
      Math.round(width * pixelRatio),
      Math.round(height * pixelRatio)
    );
    const space = tile.getContext('2d');

    if (!space) return;

    space.scale(pixelRatio, pixelRatio);

    for (const star of starfield.value) {
      if (star.layer === layer) drawStar(space, star, width, height);
    }

    layers.push(await createImageBitmap(tile));
  }

  globalThis.STARFIELD_LAYERS = layers;
};
