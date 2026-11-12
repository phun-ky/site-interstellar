import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { findBodyById } from '../../celestial-bodies/utils/body-catalog';
import { getOrbitSize, getSystemMap } from '../utils/get-system-map';

const body = (id: string) => {
  const found = findBodyById(id);

  assert.ok(found, `${id} is in the catalogue`);

  return found;
};
const ringIds = (id: string) =>
  getSystemMap(body(id))?.rings.map((ring) => ring.id);

describe('getSystemMap', () => {
  test('shows a planet among the planets, round the Sun', () => {
    const system = getSystemMap(body('earth'));

    assert.equal(system?.name, 'Solar system');
    assert.equal(system?.centre.id, 'sun');
    assert.equal(system?.focus.id, 'earth');
    assert.deepEqual(ringIds('earth'), [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune'
    ]);
  });

  test('shows a moon round its planet', () => {
    const system = getSystemMap(body('phobos'));

    assert.equal(system?.name, 'Mars system');
    assert.deepEqual(ringIds('phobos'), ['phobos', 'deimos']);
  });

  test('puts a star with planets in the middle of its own system', () => {
    const system = getSystemMap(body('sun'));

    assert.equal(system?.centre.id, 'sun');
    assert.equal(system?.rings.length, 8);
  });

  test('leaves dwarf planets out, but for the focused one', () => {
    assert.ok(!ringIds('earth')?.includes('pluto'));
    assert.ok(ringIds('pluto')?.includes('pluto'));
  });

  test('lists the rings innermost first', () => {
    const sizes = getSystemMap(body('io'))?.rings.map(getOrbitSize) ?? [];

    assert.ok(sizes.length > 1);
    assert.deepEqual(
      sizes,
      [...sizes].sort((a, b) => a - b)
    );
  });
});
