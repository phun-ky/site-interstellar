import { convertTemporalUnit } from '@interstellar-tools/temporal';
import { TemporalInterface } from '@interstellar-tools/types';

import { formatNumber, formatPeriod } from './format';

/** A fact for the body info: its label and its value. */
export type FactType = [label: string, value: string];

/** What the facts read from a body's `observations`, as far as they need it. */
type ObservedBodyType = {
  /** A star's mass, in solar masses. */
  mass?: number;
  rotation?: {
    period: TemporalInterface;
    equatorialPeriod?: TemporalInterface;
    polarPeriod?: TemporalInterface;
    retrograde?: boolean;
    synchronous?: boolean;
    tumbling?: boolean;
  };
  observations?: {
    logSurfaceGravity?: { value: number };
    metallicity?: { value: number };
    spectralClassification?: { raw: string };
    effectiveTemperature?: { value: number; unit: string };
    luminosity?: { value: number; unit: string };
    rings?: { rings: unknown[] };
    discovery?: {
      date?: Date | string;
      discoverers?: string[];
      facility?: string;
    };
  };
};

/** Units as the info shows them. */
const UNITS: Record<string, string> = { L_sun: 'L☉' };
const withUnit = ({ value, unit }: { value: number; unit: string }): string =>
  `${formatNumber(value)} ${UNITS[unit] ?? unit}`;
/** A difference from the Sun's abundance, signed: `+0.24`, `-0.52`, `0.00`. */
const SIGNED = new Intl.NumberFormat('en', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero'
});
/** Below this many days, a rotation reads better in hours. */
const HOURS_BELOW_DAYS = 2;

/**
 * Formats a rotation period: in hours below two days (Earth's 23.93 h), and
 * as `formatPeriod` does from there (the Moon's 27.32 d).
 *
 * @param {TemporalInterface} period - The period.
 * @returns {string} The period, formatted.
 *
 * @example
 * ```ts
 * formatRotation({ value: 0.99727, unit: 'd' }); // "23.93 h"
 * ```
 */
export const formatRotation = (period: TemporalInterface): string => {
  const days = convertTemporalUnit(period, 'd').value;

  return days < HOURS_BELOW_DAYS
    ? `${formatNumber(convertTemporalUnit(period, 'h').value)} h`
    : formatPeriod(period);
};

/**
 * A star's facts, as far as they are known: its mass, and what is measured
 * about it, its effective temperature, luminosity, surface gravity (log g)
 * and metallicity ([Fe/H], against the Sun's). Its spectral class is its
 * type (see `getTypeLabel`).
 *
 * @param {ObservedBodyType} body - The star.
 * @returns {FactType[]} The facts, such as `['Temperature', '5,772 K']`.
 *
 * @example
 * ```ts
 * getStarFacts(sun); // [['Mass', '1 M☉'], ['Temperature', '5,772 K'], …]
 * ```
 */
export const getStarFacts = ({
  mass,
  observations
}: ObservedBodyType): FactType[] => {
  const facts: FactType[] = [];
  const { effectiveTemperature, luminosity, logSurfaceGravity, metallicity } =
    observations ?? {};

  if (mass !== undefined) facts.push(['Mass', `${formatNumber(mass)} M☉`]);

  if (effectiveTemperature) {
    facts.push(['Temperature', withUnit(effectiveTemperature)]);
  }

  if (luminosity) facts.push(['Luminosity', withUnit(luminosity)]);

  if (logSurfaceGravity) {
    facts.push([
      'Surface gravity',
      `log g ${formatNumber(logSurfaceGravity.value)}`
    ]);
  }

  if (metallicity) {
    facts.push(['Metallicity', `[Fe/H] ${SIGNED.format(metallicity.value)}`]);
  }

  return facts;
};

/**
 * How a body turns: its rotation period, and whether it turns backwards, keeps
 * one face to its planet, or tumbles. A body that turns faster at its
 * equator than at its poles, as the Sun does, gives both too.
 *
 * @param {ObservedBodyType} body - The body.
 * @returns {FactType[]} Such as `['Rotation', '243 d · retrograde']`, or nothing.
 *
 * @example
 * ```ts
 * getRotationFacts(moon); // [['Rotation', '27.32 d · tidally locked']]
 * ```
 */
export const getRotationFacts = ({
  rotation
}: ObservedBodyType): FactType[] => {
  if (!rotation) return [];

  const how = [
    rotation.retrograde && 'retrograde',
    rotation.synchronous && 'tidally locked',
    rotation.tumbling && 'tumbling'
  ].filter(Boolean);
  const facts: FactType[] = [
    ['Rotation', [formatRotation(rotation.period), ...how].join(' · ')]
  ];

  if (rotation.equatorialPeriod) {
    facts.push(['At the equator', formatRotation(rotation.equatorialPeriod)]);
  }

  if (rotation.polarPeriod) {
    facts.push(['At the poles', formatRotation(rotation.polarPeriod)]);
  }

  return facts;
};

/**
 * What a body's type is called in its facts: `Spectral class` for a star,
 * whose type is its spectral class (`G2V`), and `Type` for the rest.
 *
 * @param {ObservedBodyType & { type?: string }} body - The body.
 * @returns {string} The label.
 *
 * @example
 * ```ts
 * getTypeLabel(sun); // "Spectral class"
 * ```
 */
export const getTypeLabel = ({
  type,
  observations
}: ObservedBodyType & { type?: string }): string =>
  type && type === observations?.spectralClassification?.raw
    ? 'Spectral class'
    : 'Type';

/**
 * How many rings a planet has, from what is measured about them.
 *
 * @param {ObservedBodyType} body - The planet.
 * @returns {FactType[]} `['Rings', '9']`, or nothing without rings.
 *
 * @example
 * ```ts
 * getRingFacts(saturn); // [['Rings', '9']]
 * ```
 */
export const getRingFacts = ({
  observations
}: ObservedBodyType): FactType[] => {
  const count = observations?.rings?.rings.length ?? 0;

  return count ? [['Rings', String(count)]] : [];
};

/**
 * When a body was discovered, and by whom: its discoverers, or else the
 * facility, without its observatory code.
 *
 * @param {ObservedBodyType} body - The body, such as an interstellar object.
 * @returns {FactType[]} Such as `['Discovered', '2017-10-19 · R. Weryk']`, or nothing.
 *
 * @example
 * ```ts
 * getDiscoveryFacts(oumuamua); // [['Discovered', '2017-10-19 · R. Weryk']]
 * ```
 */
export const getDiscoveryFacts = ({
  observations
}: ObservedBodyType): FactType[] => {
  const { date, discoverers, facility } = observations?.discovery ?? {};

  if (!date) return [];

  const by = discoverers?.length
    ? discoverers.join(', ')
    : facility?.split(',')[0].trim();
  // The date alone, as the telemetry shows dates: 2017-10-19
  const day = new Date(date).toISOString().slice(0, 10);

  return [['Discovered', [day, by].filter(Boolean).join(' · ')]];
};
