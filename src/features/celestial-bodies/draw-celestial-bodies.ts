import { TWO_PI } from '@interstellar-tools/constants';
import {
  CelestialBodiesType,
  CelestialBodyType,
  ValueInterface
} from '@interstellar-tools/types';

import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { getFocusShift } from '../ui/focus-state';

import { getBodyPosition } from './utils/get-body-position';
import { getDrawnSize } from './utils/get-drawn-size';

/** How far a star's glow reaches, as a multiple of its drawn radius. */
const STAR_GLOW_RADIUS = 3;
/** Opacity of a star's glow at its brightest. */
const STAR_GLOW_OPACITY = 0.35;

/**
 * Draws a star: a disc in its colour, glowing softly round it.
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 * @param {number} x - Where its centre is, in pixels.
 * @param {number} y - Where its centre is, in pixels.
 * @param {number} size - Its drawn radius, in pixels.
 * @param {string} color - Its colour.
 *
 * @example
 * ```ts
 * drawStar(space, 640, 360, 8, '#fff4ea');
 * ```
 */
export const drawStar = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void => {
  const glow = space.createRadialGradient(
    x,
    y,
    size * 0.8,
    x,
    y,
    size * STAR_GLOW_RADIUS
  );

  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  space.globalAlpha = STAR_GLOW_OPACITY;
  space.fillStyle = glow;
  space.beginPath();
  space.arc(x, y, size * STAR_GLOW_RADIUS, 0, TWO_PI);
  space.fill();
  space.globalAlpha = 1;
  space.fillStyle = color;
  space.beginPath();
  space.arc(x, y, size, 0, TWO_PI);
  space.fill();
};

export type DrawCelestialBodiesPropsType = {
  space: CanvasRenderingContext2D;
  referenceX: number;
  referenceY: number;
  scale: ValueInterface;
  celestialBodies: CelestialBodiesType;
};

/**
 * Renders celestial bodies onto a 2D canvas based on their orbital parameters.
 *
 * **Mathematical Explanation:**
 *
 * Celestial bodies follow **elliptical orbits** with positions computed as:
 * $$
 * x = a \cos(\theta) - f
 * $$
 * $$
 * y = b \sin(\theta)
 * $$
 * where:
 * - $a$ is the **semi-major axis** in astronomical units (AU).
 * - $b = a\sqrt{1 - e^2}$ is the **semi-minor axis**.
 * - $\theta$ is the **true anomaly**.
 * - $f = e \cdot a$ is the **focus shift**.
 * - $(x, y)$ is the **celestial body's position** in AU.
 *
 * The **rendered size** of each celestial body comes from `getDrawnSize`: a
 * size by its kind and radius when zoomed out, blending into its true size
 * as you zoom in, and smaller while crowded against its parent (#109).
 *
 * @param {DrawCelestialBodiesPropsType} props - Object containing rendering parameters.
 * @param {CanvasRenderingContext2D} props.space - The 2D rendering context of the canvas.
 * @param {number} props.referenceX - The x-coordinate of the galactic center in pixels.
 * @param {number} props.referenceY - The y-coordinate of the galactic center in pixels.
 * @param {ValueInterface} props.scale - The scale factor converting real-world units to pixels.
 * @param {CelestialBodiesType} props.celestialBodies - Array of celestial bodies with orbital parameters.
 * @returns {void} This function does not return a value; it renders celestial bodies onto the canvas.
 *
 * @example
 * ```ts
 * const celestialBodies: CelestialBodiesType = [
 *   {
 *     name: 'Star A',
 *     a: { value: 5000, unit: 'au' },
 *     e: 0.1,
 *     radius: { value: 696340, unit: 'km' },
 *     color: 'white',
 *     angle: 0,
 *     miA: 5000 * Math.sqrt(1 - 0.1 ** 2), // Semi-minor axis
 *     focus_x: 0.1 * 5000 // Focus shift
 *   }
 * ];
 *
 * drawCelestialBodies({
 *   space: ctx,
 *   referenceX: 500,
 *   referenceY: 500,
 *   scale: { value: 50 },
 *   celestialBodies: celestialBodies
 * });
 * ```
 *
 * @see [Elliptical Orbits](https://en.wikipedia.org/wiki/Ellipse)
 */
export const drawCelestialBodies = (
  props: DrawCelestialBodiesPropsType
): void => {
  const { space, referenceX, referenceY, scale, celestialBodies } = props;
  const focused = globalThis.FOCUSED_CELESTIAL_BODY;

  space.save();

  celestialBodies.forEach((body: CelestialBodyType) => {
    const { name, display } = body;
    const { x, y } = getBodyPosition(body);
    // The focused body is pinned to the middle of the view: zoomed in on a
    // small body, rounding in its galactic position is many pixels
    const isFocused = focused?.id === body.id;
    const shift = getFocusShift();
    const xPX = isFocused
      ? space.canvas.clientWidth / 2 + shift.x
      : referenceX + distanceToPixels(x, scale);
    const yPX = isFocused
      ? space.canvas.clientHeight / 2 + shift.y
      : referenceY + distanceToPixels(y, scale);
    // How far it is drawn from its parent: 0 for a body that sits on it
    const size = getDrawnSize(
      body,
      scale,
      Math.hypot(xPX - referenceX, yPX - referenceY)
    );
    const color = display?.color ?? 'white';

    globalThis.NEAREST_BODIES[body.id] = {
      id: body.id,
      x: xPX,
      y: yPX,
      size,
      name,
      category: body.category,
      parent: body.category.includes('satellite') ? body.parent : undefined
    };

    space.fillStyle = color;
    space.beginPath();
    space.arc(xPX, yPX, size, 0, TWO_PI);
    space.fill();
  });

  space.restore();
};
