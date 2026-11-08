import { CANVAS_COLORS } from '../canvas/config/ui';

/** Smallest half-width of the reticle, in pixels. */
const RETICLE_MIN_HALF_SIZE = 14;
/** Gap between the drawn body and the reticle, in pixels. */
const RETICLE_GAP = 8;
/** Length of each corner bracket's arms, in pixels. */
const RETICLE_ARM = 6;

/**
 * Half the width of the reticle round a body: it hugs the body, growing with
 * its drawn size.
 *
 * @param {number} size - The radius the body is drawn with, in pixels.
 * @returns {number} Half the reticle's width, in pixels.
 *
 * @example
 * ```ts
 * getReticleHalfSize(4); // 14
 * ```
 */
export const getReticleHalfSize = (size: number): number =>
  Math.max(RETICLE_MIN_HALF_SIZE, size + RETICLE_GAP);

/**
 * Draws an amber target reticle (four corner brackets) around the body the
 * camera is locked on.
 *
 * The body's screen position comes from `globalThis.NEAREST_BODIES`, which
 * holds the bodies drawn in the current frame, so call this after the bodies
 * are drawn. Nothing is drawn when no body is locked or the locked body was
 * not drawn this frame.
 *
 * @param {CanvasRenderingContext2D} space - The rendering context for the canvas.
 *
 * @example
 * ```ts
 * drawLockReticle(space);
 * ```
 */
export const drawLockReticle = (space: CanvasRenderingContext2D): void => {
  const locked = globalThis.LOCKED_CELESTIAL_BODY;

  if (!locked) return;

  const tracked = globalThis.NEAREST_BODIES[locked.id];

  if (!tracked) return;

  const { x, y, size } = tracked;
  const s = getReticleHalfSize(size);
  const a = Math.max(RETICLE_ARM, s * 0.25);

  space.save();
  space.strokeStyle = CANVAS_COLORS.amber;
  space.lineWidth = 2;
  space.lineCap = 'butt';
  space.beginPath();
  // top left
  space.moveTo(x - s, y - s + a);
  space.lineTo(x - s, y - s);
  space.lineTo(x - s + a, y - s);
  // top right
  space.moveTo(x + s - a, y - s);
  space.lineTo(x + s, y - s);
  space.lineTo(x + s, y - s + a);
  // bottom right
  space.moveTo(x + s, y + s - a);
  space.lineTo(x + s, y + s);
  space.lineTo(x + s - a, y + s);
  // bottom left
  space.moveTo(x - s + a, y + s);
  space.lineTo(x - s, y + s);
  space.lineTo(x - s, y + s - a);
  space.stroke();
  space.restore();
};
