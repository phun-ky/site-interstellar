import { GALAXY_BODIES } from '../../celestial-bodies/utils/body-catalog';

import { type MapPointType, MILKY_WAY_RADIUS_AU } from './get-minimap-context';

/** How much of the minimap's half width the drawing may fill. */
export const FILL = 0.88;

/**
 * Where a point in the Milky Way goes on the minimap: the Milky Way's disc
 * fills it, with its centre in the middle.
 *
 * @param {MapPointType} point - The point, from the Milky Way's centre, in au.
 * @param {number} size - The minimap's width, in pixels.
 * @returns {MapPointType} Where to draw it, in pixels.
 *
 * @example
 * ```ts
 * toGalaxyMap({ x: 0, y: 0 }, 160); // { x: 80, y: 80 }
 * ```
 */
export const toGalaxyMap = (
  { x, y }: MapPointType,
  size: number
): MapPointType => {
  const perAu = (size / 2) * (FILL / MILKY_WAY_RADIUS_AU);

  return { x: size / 2 + x * perAu, y: size / 2 + y * perAu };
};

/**
 * The nearest and farthest neighbouring galaxy, from the Milky Way's centre.
 *
 * @returns {[number, number]} The two distances, in au.
 */
export const getNeighbourReach = (): [near: number, far: number] => {
  const distances = GALAXY_BODIES.map(({ position }) =>
    Math.hypot(position.x.value, position.y.value)
  );

  return [Math.min(...distances), Math.max(...distances)];
};

/**
 * Where a neighbouring galaxy goes on the minimap: in its direction from
 * the Milky Way, at a distance on a log scale, so the Magellanic Clouds and
 * Messier 87, 300 times as far, both fit.
 *
 * @param {MapPointType} position - The galaxy's position, from the Milky Way's centre, in au.
 * @param {number} size - The minimap's width, in pixels.
 * @param {[number, number]} [reach] - The nearest and farthest neighbour, in au.
 * @returns {MapPointType} Where to draw it, in pixels.
 *
 * @example
 * ```ts
 * toNeighbourMap(andromeda.position, 160);
 * ```
 */
export const toNeighbourMap = (
  position: MapPointType,
  size: number,
  [near, far]: [number, number] = getNeighbourReach()
): MapPointType => {
  const mid = size / 2;
  const inner = mid * 0.32;
  const outer = mid * FILL;
  const distance = Math.hypot(position.x, position.y);
  const share =
    far > near
      ? (Math.log(distance) - Math.log(near)) / Math.log(far / near)
      : 0.5;
  const radius = inner + Math.min(1, Math.max(0, share)) * (outer - inner);
  const angle = Math.atan2(position.y, position.x);

  return {
    x: mid + Math.cos(angle) * radius,
    y: mid + Math.sin(angle) * radius
  };
};
