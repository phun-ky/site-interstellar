import { AU_PER_LY } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';
import { convertTemporalUnit } from '@interstellar-tools/temporal';
import {
  DistanceInterface,
  TemporalInterface
} from '@interstellar-tools/types';

const NUMBER = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 });
const COMPACT = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumSignificantDigits: 3
});
const LONG = new Intl.NumberFormat('en', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3
});
/** Below this many au, a distance reads better in km. */
const KM_BELOW_AU = 0.01;

/**
 * Formats a number for the HUD: up to 4 significant digits, and compact
 * (`1.2M`) from 100 000 up.
 *
 * @param {number} value - The number.
 * @returns {string} The number, formatted.
 *
 * @example
 * ```ts
 * formatNumber(365.256); // "365.3"
 * ```
 */
export const formatNumber = (value: number): string =>
  Math.abs(value) >= 1e5 ? COMPACT.format(value) : NUMBER.format(value);

/**
 * Formats a large number in words, from a million up, where `M` would read
 * as a unit: a black hole's mass in solar masses.
 *
 * @param {number} value - The number.
 * @returns {string} Such as `4.3 million`, or as `formatNumber` below it.
 *
 * @example
 * ```ts
 * formatLargeNumber(6.5e9); // "6.5 billion"
 * ```
 */
export const formatLargeNumber = (value: number): string =>
  Math.abs(value) >= 1e6 ? LONG.format(value) : formatNumber(value);

/**
 * Formats a distance in its own unit.
 *
 * @param {DistanceInterface} distance - The distance.
 * @returns {string} Such as `1.524 au`.
 *
 * @example
 * ```ts
 * formatDistance({ value: 1.524, unit: 'au' }); // "1.524 au"
 * ```
 */
export const formatDistance = ({ value, unit }: DistanceInterface): string =>
  `${formatNumber(value)} ${unit}`;

/**
 * Formats a distance given in au in the unit that reads best: km for a
 * moon's orbit, au within a star system, ly beyond one light year.
 *
 * @param {number} au - The distance, in au.
 * @returns {string} Such as `384,400 km`, `5.203 au` or `4.37 ly`.
 *
 * @example
 * ```ts
 * formatAu(0.00257); // "384.5K km"
 * ```
 */
export const formatAu = (au: number): string => {
  if (Math.abs(au) < KM_BELOW_AU) {
    return formatDistance(convertDistanceUnit({ value: au, unit: 'au' }, 'km'));
  }

  if (Math.abs(au) >= AU_PER_LY) {
    return formatDistance({ value: au / AU_PER_LY, unit: 'ly' });
  }

  return formatDistance({ value: au, unit: 'au' });
};

/**
 * Formats a period in days below 1000 days, and in years from there.
 *
 * @param {TemporalInterface} period - The period.
 * @returns {string} Such as `687 d` or `11.86 yr`.
 *
 * @example
 * ```ts
 * formatPeriod({ value: 365.256, unit: 'd' }); // "365.3 d"
 * ```
 */
export const formatPeriod = (period: TemporalInterface): string => {
  const days = convertTemporalUnit(period, 'd').value;

  if (days < 1000) return `${formatNumber(days)} d`;

  return `${formatNumber(convertTemporalUnit(period, 'yr').value)} yr`;
};
