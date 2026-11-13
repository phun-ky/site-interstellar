/**
 * Whether the camera is inside a galaxy: its disc, `radius` pixels round its
 * core at `x`, `y`, covers the whole canvas. From there its core is its
 * black hole.
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 * @param {number} x - The galaxy's core, in pixels.
 * @param {number} y - The galaxy's core, in pixels.
 * @param {number} radius - The galaxy's drawn radius, in pixels.
 * @returns {boolean} Whether every corner of the canvas is inside the disc.
 *
 * @example
 * ```ts
 * isInside(space, 720, 418, 5000); // true on a 1440 x 836 canvas
 * ```
 */
export const isInside = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): boolean => {
  const { clientWidth: width, clientHeight: height } = space.canvas;

  return (
    Math.hypot(x - width / 2, y - height / 2) + Math.hypot(width, height) / 2 <
    radius
  );
};
