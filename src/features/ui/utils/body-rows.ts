import { convertDistanceUnit } from '@interstellar-tools/equations';
import { convertTemporalUnit } from '@interstellar-tools/temporal';

import {
  BODY_KIND_LABELS,
  type BodyKindType,
  findBodyById,
  getBodyKind
} from '../../celestial-bodies/utils/body-catalog';
import {
  type AnyOrbitType,
  isOpenOrbit
} from '../../celestial-bodies/utils/orbit-orientation';

/** A body as the Bodies table lists it (#14). */
export type BodyRowType = {
  id: string;
  name: string;
  kind: BodyKindType;
  /** Its type, such as `Gas giant`, or else its kind. */
  type: string;
  /** What it orbits, or an empty string. */
  orbits: string;
  /** Its orbit's semi-major axis, in au; `null` for an open orbit or none. */
  a: number | null;
  /** Its orbit's eccentricity; `null` without an orbit. */
  e: number | null;
  /** Its orbital period, in days; `null` for an open orbit or none. */
  period: number | null;
};

/** What the table can be sorted by. */
export type BodySortKeyType = 'name' | 'type' | 'orbits' | 'a' | 'e' | 'period';

/** A body, from any dataset, as far as the table needs it. */
type ListedBodyType = {
  id: string;
  name: string;
  type?: string;
  category?: string;
  parent?: string;
  orbit?: AnyOrbitType;
};

/** The kinds, in the order the filters list them. */
export const LISTED_KINDS: BodyKindType[] = [
  'star',
  'planet',
  'moon',
  'asteroid',
  'comet',
  'interstellar',
  'galaxy'
];

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);
/** A name to search by: lower case, without accents or marks (`ʻOumuamua` is `oumuamua`). */
const searchKey = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, '');

/**
 * Lists bodies as table rows: each with its kind, type, what it orbits and
 * its orbit's size, eccentricity and period. Bodies of no listed kind (a
 * star system) are left out.
 *
 * @param {ListedBodyType[]} bodies - The bodies, from every dataset.
 * @returns {BodyRowType[]} A row each.
 *
 * @example
 * ```ts
 * getBodyRows([...STARS, ...PLANETS]);
 * ```
 */
export const getBodyRows = (bodies: ListedBodyType[]): BodyRowType[] =>
  bodies.flatMap((body) => {
    const kind = getBodyKind(body.id);

    if (!kind || !LISTED_KINDS.includes(kind)) return [];

    const { orbit } = body;
    const closed = orbit && !isOpenOrbit(orbit) ? orbit : undefined;

    return [
      {
        id: body.id,
        name: body.name,
        kind,
        type: capitalize(body.type ?? BODY_KIND_LABELS[kind]),
        orbits: body.parent
          ? (findBodyById(body.parent)?.name ??
            (body.parent === 'milky-way' ? 'Milky Way' : body.parent))
          : '',
        a: closed ? convertDistanceUnit(closed.a, 'au').value : null,
        e: orbit ? orbit.e : null,
        period: closed ? convertTemporalUnit(closed.period, 'd').value : null
      }
    ];
  });

/**
 * Sorts rows by a column. Text sorts alphabetically, numbers by size; a row
 * without the value (an open orbit has no period) goes last either way.
 * Ties keep their order.
 *
 * @param {BodyRowType[]} rows - The rows.
 * @param {BodySortKeyType} key - The column.
 * @param {'ascending' | 'descending'} direction - The direction.
 * @returns {BodyRowType[]} The rows, sorted, as a new array.
 *
 * @example
 * ```ts
 * sortRows(rows, 'a', 'ascending');
 * ```
 */
export const sortRows = (
  rows: BodyRowType[],
  key: BodySortKeyType,
  direction: 'ascending' | 'descending'
): BodyRowType[] => {
  const sign = direction === 'ascending' ? 1 : -1;

  return [...rows].sort((x, y) => {
    const [a, b] = [x[key], y[key]];

    if (a === null || a === '') return b === null || b === '' ? 0 : 1;

    if (b === null || b === '') return -1;

    return (
      sign *
      (typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b), 'en'))
    );
  });
};

/**
 * Keeps the rows of a kind whose name matches a search, ignoring case,
 * accents and marks.
 *
 * @param {BodyRowType[]} rows - The rows.
 * @param {{ kind: BodyKindType | 'all'; query: string }} filter - The kind (or `all`) and the search.
 * @returns {BodyRowType[]} The matching rows.
 *
 * @example
 * ```ts
 * filterRows(rows, { kind: 'moon', query: 'ganym' }); // Ganymede
 * ```
 */
export const filterRows = (
  rows: BodyRowType[],
  { kind, query }: { kind: BodyKindType | 'all'; query: string }
): BodyRowType[] => {
  const key = searchKey(query.trim());

  return rows.filter(
    (row) =>
      (kind === 'all' || row.kind === kind) &&
      (!key || searchKey(row.name).includes(key))
  );
};

/**
 * Counts rows by kind, for the filters.
 *
 * @param {BodyRowType[]} rows - The rows.
 * @returns {Record<BodyKindType | 'all', number>} How many there are of each kind, and in all.
 *
 * @example
 * ```ts
 * countByKind(rows).moon; // 214
 * ```
 */
export const countByKind = (
  rows: BodyRowType[]
): Partial<Record<BodyKindType | 'all', number>> =>
  rows.reduce<Partial<Record<BodyKindType | 'all', number>>>(
    (counts, { kind }) => ({
      ...counts,
      all: (counts.all ?? 0) + 1,
      [kind]: (counts[kind] ?? 0) + 1
    }),
    {}
  );
