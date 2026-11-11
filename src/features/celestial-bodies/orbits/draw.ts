import { convertTemporalUnit } from '@interstellar-tools/temporal';
import { ValueInterface } from '@interstellar-tools/types';

import { TRAIL_SCALING_FACTOR } from '../../../config/constants';
import {
  OrbitingBodiesType,
  OrbitingBodyType
} from '../../../types/orbiting-bodies';
import { distanceToPixels } from '../../../utils/distance/distance-to-pixels';
import { getViewportSize } from '../../canvas/get-viewport-size';
import { getBodyPosition } from '../utils/get-body-position';
import { isOpenOrbit } from '../utils/orbit-orientation';

import { getOrbitStyle } from './orbit-style';
import { traceOrbit } from './trace-orbit';

/** How long an open orbit's trail is, in days of a closed orbit's period. */
const OPEN_ORBIT_TRAIL_DAYS = 365.25;

export type DrawOrbitsPropsType = {
  celestialBodies: OrbitingBodiesType;
  toggled: boolean;
  space: CanvasRenderingContext2D;
  referenceX: number;
  referenceY: number;
  scale: ValueInterface;
};

/**
 * Renders the **orbital paths** of celestial bodies around a galactic center onto a 2D canvas.
 *
 * **Mathematical Explanation:**
 *
 * A celestial body follows an **elliptical orbit** with its parent at one of its foci.
 * In `orbits` mode the ellipse is traced for the current view by `traceOrbit()`, which
 * keeps it accurate at any zoom level. Its points $(x, y)$ are:
 * $$
 * x = a \cos(\theta) - f
 * $$
 * $$
 * y = b \sin(\theta)
 * $$
 * where:
 * - $a$ is the **semi-major axis** in real-world units (e.g., AU or light-years).
 * - $b$ is the **semi-minor axis** in real-world units.
 * - $\theta$ runs from $0$ to $2\pi$ around the ellipse.
 * - $f = e \cdot a$ is the **focus shift** (due to eccentricity), calculated in real-world units.
 * - $(x, y)$ represents the **position of a point** on the orbit in real-world units.
 *
 * The **focus shift** accounts for the elliptical nature of the orbit, ensuring accurate rendering.
 *
 * @param {DrawOrbitsPropsType} props - Contains orbital data and rendering parameters.
 * @returns {void} This function does not return a value; it renders the orbits directly onto the canvas.
 *
 * @example
 * ```ts
 * drawOrbits({
 *   space: ctx,
 *   referenceX: 500,
 *   referenceY: 500,
 *   toggled: true,
 *   celestialBodies,
 *   scale: { value: 1 }
 * });
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Ellipse
 */
export const drawOrbits = (props: DrawOrbitsPropsType): void => {
  const { celestialBodies, toggled, space, referenceX, referenceY, scale } =
    props;

  // Skip rendering if orbits are toggled off
  if (!toggled) return;

  const viewport = getViewportSize(space.canvas);

  celestialBodies.forEach((body: OrbitingBodyType) => {
    const { orbit } = body;

    // Skip rendering for celestial bodies without an orbit
    if (!orbit) return;

    const style = getOrbitStyle(body);

    if (globalThis.TRAJECTORY_TYPE === 'orbits') {
      // Trace the orbit for the current view, so it stays accurate at any zoom level
      space.save();
      space.beginPath();
      space.strokeStyle = style.color;
      space.globalAlpha = style.alpha;
      space.lineWidth = style.width;
      traceOrbit(
        space,
        orbit,
        referenceX,
        referenceY,
        scale,
        viewport.width,
        viewport.height
      );
      space.stroke();
      space.restore();
    } else if (globalThis.TRAJECTORY_TYPE === 'trails') {
      // **Disable trails if zooming or panning**
      if (globalThis.IS_ZOOMING_OR_PANNING) {
        try {
          globalThis.TRAJECTORY_TRAILS[body.id] = [];
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          return;
        }

        return;
      }

      // An open orbit has no period: its trail is as long as a year's
      let periodInDays = isOpenOrbit(orbit)
        ? OPEN_ORBIT_TRAIL_DAYS
        : convertTemporalUnit(orbit.period, 'd').value;

      // Prevent division by zero but keep sign for retrograde motion
      if (Math.abs(periodInDays) < 1) periodInDays = periodInDays < 0 ? -1 : 1;

      const maxTrailLength = Math.abs(periodInDays) * TRAIL_SCALING_FACTOR;
      const { x, y } = getBodyPosition(body);
      const xPX = distanceToPixels(x, scale);
      const yPX = distanceToPixels(y, scale);
      const bodyX = referenceX + xPX;
      const bodyY = referenceY + yPX;

      // Trajectory Trails Mode
      if (!globalThis.TRAJECTORY_TRAILS[body.id]) {
        globalThis.TRAJECTORY_TRAILS[body.id] = [];
      }

      // Store latest positions (limit to 100 past positions)
      globalThis.TRAJECTORY_TRAILS[body.id].push({ x: bodyX, y: bodyY });

      // Ensure retrograde motion is visually accurate
      if (globalThis.TRAJECTORY_TRAILS[body.id].length > maxTrailLength) {
        globalThis.TRAJECTORY_TRAILS[body.id].shift(); // Remove oldest point normally
      }

      // Draw the trail with fading and thickness effect
      for (
        let i = 0;
        i < globalThis.TRAJECTORY_TRAILS[body.id].length - 1;
        i++
      ) {
        const start = globalThis.TRAJECTORY_TRAILS[body.id][i];
        const end = globalThis.TRAJECTORY_TRAILS[body.id][i + 1];
        const alpha = (i + 1) / globalThis.TRAJECTORY_TRAILS[body.id].length; // Fade effect
        const lineWidth = 1 + 2 * alpha; // Thicker at the end, thinner at the start

        space.beginPath();
        space.strokeStyle = style.color;
        space.globalAlpha = style.alpha * alpha;
        space.lineWidth = lineWidth;
        space.moveTo(start.x, start.y);
        space.lineTo(end.x, end.y);
        space.stroke();
        space.closePath();
      }

      space.globalAlpha = 1;
    }
  });
};
