import { convertDistanceUnit } from '@interstellar-tools/equations';
import { convertTemporalUnit } from '@interstellar-tools/temporal';
import { CelestialBodyType } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';
import {
  findBodyById,
  getBodyKind
} from '../../celestial-bodies/utils/body-catalog';
import { SIZE_BANDS } from '../../celestial-bodies/utils/get-drawn-size';
import { getOrbitSize, getSystemMap } from '../../minimap/utils/get-system-map';

const ROMAN: [value: number, numeral: string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
];

/**
 * Writes a number from 1 to 39 in Roman numerals.
 *
 * @param {number} value - The number.
 * @returns {string} Its numerals, as in "IV".
 *
 * @example
 * ```ts
 * toRoman(3); // "III"
 * ```
 */
export const toRoman = (value: number): string => {
  let rest = value;
  let text = '';

  for (const [step, numeral] of ROMAN) {
    while (rest >= step) {
      text += numeral;
      rest -= step;
    }
  }

  return text;
};

/**
 * A catalogue-style designation: what the body orbits and its place out
 * from it among the bodies on the system map, as in Sun III for Earth or
 * Mars I for Phobos. A black hole goes by its name (Sagittarius A*); any
 * other body falls back to its id.
 *
 * @param {CelestialBodyType} body - The body.
 * @returns {string} Its designation.
 *
 * @example
 * ```ts
 * getDesignation(earth); // "Sun III"
 * ```
 */
export const getDesignation = (body: CelestialBodyType): string => {
  if (getBodyKind(body.id) === 'blackHole') return body.name.toUpperCase();

  const parent = findBodyById(body.parent);
  const system = getSystemMap(body);
  const order = system?.rings.findIndex(({ id }) => id === body.id) ?? -1;

  if (!parent || system?.centre.id !== parent.id || order < 0) {
    return body.id.toUpperCase();
  }

  return `${parent.name} ${toRoman(order + 1)}`;
};

/**
 * Where a body is: the chain of what it orbits, from the Milky Way in,
 * leaving out star systems (Alpha Centauri A is in Milky Way, not Milky
 * Way, Alpha Centauri). A body in another galaxy starts from that galaxy
 * (M87* is in M87).
 *
 * @param {OrbitingBodyType} body - The body.
 * @returns {string[]} The names, outermost first.
 *
 * @example
 * ```ts
 * getPath(phobos); // ["Milky Way", "Sun", "Mars"]
 * getPath(m87Star); // ["M87"]
 * ```
 */
export const getPath = (body: OrbitingBodyType): string[] => {
  const names: string[] = [];

  let current = findBodyById(body.parent);
  let outermost: OrbitingBodyType | undefined;

  while (current) {
    if (getBodyKind(current.id) !== 'system') names.unshift(current.name);

    outermost = current;
    current = findBodyById(current.parent);
  }

  // A body in another galaxy (M87's black hole) is placed in it, not ours
  return outermost && getBodyKind(outermost.id) === 'galaxy'
    ? names
    : ['Milky Way', ...names];
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** Where a value falls between the least and most of some values, on a log scale. */
const logShare = (value: number, values: number[]): number => {
  const low = Math.log(Math.min(...values));
  const high = Math.log(Math.max(...values));

  return high - low < 1e-9
    ? 1
    : clamp01((Math.log(value) - low) / (high - low));
};

/**
 * How full each of a body's fact gauges is, from 0 to 1, keyed by the
 * fact's label: its radius among bodies of its kind (the drawn size bands),
 * its eccentricity as it is, and its semi-major axis and period among the
 * bodies on its system map, both on log scales.
 *
 * @param {CelestialBodyType} body - The body.
 * @returns {Record<string, number>} The gauges, by fact label.
 *
 * @example
 * ```ts
 * getGauges(jupiter).Radius; // 1, the largest planet
 * ```
 */
export const getGauges = (body: CelestialBodyType): Record<string, number> => {
  const kind = getBodyKind(body.id);
  const band =
    kind === 'star' || kind === 'planet' || kind === 'moon'
      ? SIZE_BANDS[kind]
      : SIZE_BANDS.small;
  const km = convertDistanceUnit(body.radius, 'km').value;
  const [min, max] = band.radiusKm.map(Math.log10);
  const gauges: Record<string, number> = {
    Radius: clamp01((Math.log10(km) - min) / (max - min))
  };
  const { orbit } = body;

  if (!orbit || !('a' in orbit)) return gauges;

  const siblings = (getSystemMap(body)?.rings ?? [body]).filter(
    (sibling) => sibling.orbit && 'a' in sibling.orbit
  );
  const days = (sibling: CelestialBodyType) =>
    sibling.orbit ? convertTemporalUnit(sibling.orbit.period, 'd').value : 1;

  gauges.Eccentricity = clamp01(orbit.e);
  gauges['Semi-major axis'] = logShare(
    getOrbitSize(body),
    siblings.map(getOrbitSize)
  );
  gauges.Period = logShare(days(body), siblings.map(days));

  return gauges;
};
