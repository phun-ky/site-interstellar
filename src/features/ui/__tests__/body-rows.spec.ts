import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  INTERSTELLAR_OBJECTS,
  MOONS,
  PLANETS,
  STARS,
  SYSTEMS
} from '@interstellar-tools/constants';

import { GALAXY_BODIES } from '../../celestial-bodies/utils/body-catalog';
import {
  type BodyRowType,
  countByKind,
  filterRows,
  getBodyRows,
  sortRows
} from '../utils/body-rows';

const ROWS = getBodyRows([
  ...SYSTEMS,
  ...STARS,
  ...PLANETS,
  ...MOONS,
  ...INTERSTELLAR_OBJECTS,
  ...GALAXY_BODIES
]);
const row = (id: string) => ROWS.find((r) => r.id === id) as BodyRowType;

describe('getBodyRows', () => {
  test('lists a planet with its type, parent and orbit', () => {
    const earth = row('earth');

    assert.equal(earth.kind, 'planet');
    assert.equal(earth.type, 'Silicate planet');
    assert.equal(earth.orbits, 'Sun');
    assert.ok(Math.abs((earth.a ?? 0) - 1) < 0.01);
    assert.ok(Math.abs((earth.period ?? 0) - 365.256) < 0.01);
    assert.ok((earth.e ?? 1) < 0.02);
  });

  test('gives an open orbit an eccentricity, but no size or period', () => {
    const oumuamua = row('1i-oumuamua');

    assert.equal(oumuamua.kind, 'interstellar');
    assert.equal(oumuamua.a, null);
    assert.equal(oumuamua.period, null);
    assert.ok((oumuamua.e ?? 0) > 1);
  });

  test('lists a galaxy with nothing it orbits', () => {
    const andromeda = row('andromeda');

    assert.equal(andromeda.kind, 'galaxy');
    assert.equal(andromeda.orbits, '');
    assert.equal(andromeda.a, null);
  });

  test('leaves star systems out', () => {
    assert.equal(
      ROWS.some(({ kind }) => kind === 'system'),
      false
    );
    assert.equal(row('alpha-centauri'), undefined);
  });
});

/** A row with only what a test needs. */
const fake = (id: string, fields: Partial<BodyRowType>): BodyRowType => ({
  id,
  name: id,
  kind: 'planet',
  type: '',
  orbits: '',
  a: null,
  e: null,
  period: null,
  ...fields
});

describe('sortRows', () => {
  test('puts rows without the value last, sorted either way', () => {
    const few = [
      fake('none', {}),
      fake('one', { a: 1 }),
      fake('three', { a: 3 }),
      fake('blank', {}),
      fake('two', { a: 2 })
    ];
    const ids = (direction: 'ascending' | 'descending') =>
      sortRows(few, 'a', direction).map(({ id }) => id);

    assert.deepEqual(ids('ascending'), [
      'one',
      'two',
      'three',
      'none',
      'blank'
    ]);
    assert.deepEqual(ids('descending'), [
      'three',
      'two',
      'one',
      'none',
      'blank'
    ]);
  });

  test('sorts by a number, either way, with missing values last', () => {
    const up = sortRows(ROWS, 'a', 'ascending');
    const down = sortRows(ROWS, 'a', 'descending');
    const known = (rows: BodyRowType[]) =>
      rows.filter(({ a }) => a !== null).map(({ a }) => a as number);

    assert.deepEqual(
      known(up),
      [...known(up)].sort((x, y) => x - y)
    );
    assert.deepEqual(
      known(down),
      [...known(down)].sort((x, y) => y - x)
    );
    assert.equal(up.at(-1)?.a, null);
    assert.equal(down.at(-1)?.a, null);
  });

  test('sorts by text alphabetically, without changing the rows given', () => {
    const before = ROWS.map(({ id }) => id);
    const names = sortRows(ROWS, 'name', 'ascending').map(({ name }) => name);

    assert.deepEqual(
      names,
      [...names].sort((x, y) => x.localeCompare(y, 'en'))
    );
    assert.deepEqual(
      ROWS.map(({ id }) => id),
      before
    );
  });
});

describe('filterRows', () => {
  test('keeps a kind', () => {
    const moons = filterRows(ROWS, { kind: 'moon', query: '' });

    assert.ok(moons.length > 0);
    assert.ok(moons.every(({ kind }) => kind === 'moon'));
  });

  test('finds a name ignoring case, accents and marks', () => {
    assert.deepEqual(
      filterRows(ROWS, { kind: 'all', query: 'GANYM' }).map(({ id }) => id),
      ['ganymede']
    );
    assert.deepEqual(
      filterRows(ROWS, { kind: 'all', query: 'oumuamua' }).map(({ id }) => id),
      ['1i-oumuamua']
    );
    assert.deepEqual(
      filterRows(ROWS, { kind: 'planet', query: 'ganymede' }),
      []
    );
    assert.deepEqual(
      filterRows([fake('héraclès', { name: 'Héraclès' })], {
        kind: 'all',
        query: 'heracles'
      }).map(({ id }) => id),
      ['héraclès']
    );
  });
});

describe('countByKind', () => {
  test('counts each kind, and all of them', () => {
    const counts = countByKind(ROWS);

    assert.equal(counts.all, ROWS.length);
    assert.equal(
      counts.moon,
      ROWS.filter(({ kind }) => kind === 'moon').length
    );
    assert.equal(counts.comet, undefined);
  });
});
