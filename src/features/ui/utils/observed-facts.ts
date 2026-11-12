import { formatNumber } from './format';

/** A fact for the body info: its label and its value. */
export type FactType = [label: string, value: string];

/** What the facts read from a body's `observations`, as far as they need it. */
type ObservedBodyType = {
  observations?: {
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

/**
 * A star's facts from what is measured about it: its effective temperature
 * and luminosity, as far as they are known. Its spectral class is its type
 * (see `getTypeLabel`).
 *
 * @param {ObservedBodyType} body - The star.
 * @returns {FactType[]} The facts, such as `['Temperature', '5,772 K']`.
 *
 * @example
 * ```ts
 * getStarFacts(sun); // [['Temperature', '5,772 K'], ['Luminosity', '1 L☉']]
 * ```
 */
export const getStarFacts = ({
  observations
}: ObservedBodyType): FactType[] => {
  const facts: FactType[] = [];
  const { effectiveTemperature, luminosity } = observations ?? {};

  if (effectiveTemperature) {
    facts.push(['Temperature', withUnit(effectiveTemperature)]);
  }

  if (luminosity) facts.push(['Luminosity', withUnit(luminosity)]);

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
