import { convertDistanceUnit } from '@interstellar-tools/equations';
import { ValueInterface } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';
import { distanceToPixels } from '../../../utils/distance/distance-to-pixels';

import { getBodyKind } from './body-catalog';

/** A size band: the radii it spans, in km, and the sizes it draws them at, in pixels. */
type SizeBandType = {
  radiusKm: [min: number, max: number];
  px: [min: number, max: number];
};

/**
 * The size band of each kind of body (#109): stars above planets, planets
 * above moons, moons above the small bodies, so each kind reads as itself
 * when zoomed out, and the larger bodies are drawn larger within each.
 */
export const SIZE_BANDS: Record<
  'star' | 'planet' | 'moon' | 'small',
  SizeBandType
> = {
  /** From a white dwarf to a supergiant like Betelgeuse */
  star: { radiusKm: [1e4, 6e8], px: [5, 13] },
  /** From Ceres to Jupiter */
  planet: { radiusKm: [500, 7e4], px: [3, 8] },
  /** From Deimos to Ganymede */
  moon: { radiusKm: [5, 2700], px: [1.5, 4] },
  /** Asteroids, comets and interstellar objects, from a boulder to Ceres's size */
  small: { radiusKm: [0.05, 500], px: [1.5, 2.5] }
};

/** How much room a body needs round it, as a multiple of its tier size, before it is drawn full size. */
const ROOM = 6;
/** The least a crowded body shrinks to, as a share of its tier size. */
const MIN_ROOM_SHARE = 0.5;
/** Nothing is drawn smaller than this, in pixels. */
const MIN_SIZE = 1;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * The size a body is drawn at when zoomed out, from its kind and radius (#109):
 * within its kind's band (see `SIZE_BANDS`), by where its radius falls on a
 * log scale, so Jupiter is drawn larger than Earth, and Ganymede than Europa.
 *
 * @param {OrbitingBodyType} body - The body.
 * @returns {number} Its size, in pixels.
 *
 * @example
 * ```ts
 * getTierSize(jupiter); // 8
 * ```
 */
export const getTierSize = (body: OrbitingBodyType): number => {
  const kind = getBodyKind(body.id);
  const band =
    kind === 'star' || kind === 'planet' || kind === 'moon'
      ? SIZE_BANDS[kind]
      : SIZE_BANDS.small;
  const km =
    'radius' in body && body.radius
      ? convertDistanceUnit(body.radius, 'km').value
      : band.radiusKm[0];
  const [minKm, maxKm] = band.radiusKm.map(Math.log10);
  const share = clamp((Math.log10(km) - minKm) / (maxKm - minKm), 0, 1);

  return band.px[0] + share * (band.px[1] - band.px[0]);
};

/**
 * The radius a body is drawn with, in pixels (#109), as the zoom changes:
 *
 * - Zoomed out, its tier size (`getTierSize`), so bodies of every kind and
 *   size can be told apart.
 * - Zoomed in, its true size, blending smoothly into it as
 *   $\sqrt{\text{true}^2 + \text{tier}^2}$, with no jump where one passes
 *   the other.
 * - Crowded against its parent on screen (its orbit less than `ROOM` times
 *   its tier size across), smaller, down to half its tier size, growing back
 *   as zooming in opens the orbit. So stars in a system, like Alpha Centauri
 *   A and B, show as separate points rather than one blot.
 *
 * Never under 1 px.
 *
 * @param {OrbitingBodyType} body - The body.
 * @param {ValueInterface} scale - The current zoom scale.
 * @param {number} orbitPx - How far the body is drawn from its parent, in pixels; 0 when it has none.
 * @returns {number} The radius to draw it with, in pixels.
 *
 * @example
 * ```ts
 * getDrawnSize(earth, SCALE, Math.hypot(x - parentX, y - parentY));
 * ```
 */
export const getDrawnSize = (
  body: OrbitingBodyType,
  scale: ValueInterface,
  orbitPx: number
): number => {
  const tier = getTierSize(body);
  const truePx =
    'radius' in body && body.radius ? distanceToPixels(body.radius, scale) : 0;
  const room =
    orbitPx > 0 ? clamp(orbitPx / (ROOM * tier), MIN_ROOM_SHARE, 1) : 1;

  return Math.max(MIN_SIZE, Math.hypot(truePx, tier * room));
};
