import { prefersReducedMotion } from '../../utils/prefers-reduced-motion';

import { type StarfieldLayerIndexType } from './generate-star-field';

/**
 * How far the map has been panned, in pixels, and zoomed, as the natural log
 * of the zoom factor, since the page opened: what the starfield's layers
 * drift by.
 */
export const starfieldMotion = { x: 0, y: 0, logZoom: 0 };

// Readable from the page, as the map's other state is
globalThis.STARFIELD_MOTION = starfieldMotion;

/**
 * How much each layer follows the map, far to near: a share of the pan, and
 * a share of the zoom's log. Near stars move most, far ones hardly.
 */
export const STARFIELD_PARALLAX: Readonly<
  Record<StarfieldLayerIndexType, { pan: number; zoom: number }>
> = {
  0: { pan: 0.02, zoom: 0.004 },
  1: { pan: 0.05, zoom: 0.01 },
  2: { pan: 0.1, zoom: 0.02 }
};

/** The most a layer is scaled, either way, as the natural log: about 28%. */
const MAX_LAYER_ZOOM = 0.25;

/**
 * Moves the starfield with a pan of the map, unless motion is reduced.
 *
 * @param {number} dx - How far the map moved across, in pixels.
 * @param {number} dy - How far it moved down, in pixels.
 * @param {boolean} [reduced] - Whether motion is reduced; read from the page by default.
 *
 * @example
 * ```ts
 * moveStarfield(12, -4);
 * ```
 */
export const moveStarfield = (
  dx: number,
  dy: number,
  reduced = prefersReducedMotion()
): void => {
  if (reduced) return;

  starfieldMotion.x += dx;
  starfieldMotion.y += dy;
};

/**
 * Zooms the starfield with the map, by the same factor, unless motion is
 * reduced.
 *
 * @param {number} factor - The new scale over the old.
 * @param {boolean} [reduced] - Whether motion is reduced; read from the page by default.
 *
 * @example
 * ```ts
 * zoomStarfield(1.1);
 * ```
 */
export const zoomStarfield = (
  factor: number,
  reduced = prefersReducedMotion()
): void => {
  if (reduced || !(factor > 0)) return;

  starfieldMotion.logZoom += Math.log(factor);
};

/**
 * Where a layer is drawn: shifted by its share of the pan, and scaled round
 * the canvas's middle by its share of the zoom, at most `MAX_LAYER_ZOOM`
 * either way, so zooming through many orders of magnitude stays subtle.
 *
 * @param {StarfieldLayerIndexType} layer - The layer, 0 the farthest.
 * @param {{ x: number; y: number; logZoom: number }} [motion] - The motion so far.
 * @returns {{ x: number; y: number; scale: number }} Its shift, in pixels, and its scale.
 *
 * @example
 * ```ts
 * getLayerTransform(2, { x: 100, y: 0, logZoom: 0 }); // { x: 10, y: 0, scale: 1 }
 * ```
 */
export const getLayerTransform = (
  layer: StarfieldLayerIndexType,
  motion = starfieldMotion
): { x: number; y: number; scale: number } => {
  const { pan, zoom } = STARFIELD_PARALLAX[layer];
  const logScale = Math.max(
    -MAX_LAYER_ZOOM,
    Math.min(MAX_LAYER_ZOOM, motion.logZoom * zoom)
  );

  return { x: motion.x * pan, y: motion.y * pan, scale: Math.exp(logScale) };
};
