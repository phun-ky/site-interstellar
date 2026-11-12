import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CelestialBodyType } from '@interstellar-tools/types';

import { findBodyById } from '../../celestial-bodies/utils/body-catalog';
import {
  getDesignation,
  getGauges,
  getPath,
  toRoman
} from '../utils/focus-facts';

const body = (id: string) => {
  const found = findBodyById(id);

  assert.ok(found, `${id} is in the catalogue`);

  return found as CelestialBodyType;
};

describe('toRoman', () => {
  test('writes 1 to 39 in Roman numerals', () => {
    assert.deepEqual([1, 3, 4, 5, 8, 9, 14, 39].map(toRoman), [
      'I',
      'III',
      'IV',
      'V',
      'VIII',
      'IX',
      'XIV',
      'XXXIX'
    ]);
  });
});

describe('getDesignation', () => {
  test('names a body after its parent and its place out from it', () => {
    assert.equal(getDesignation(body('earth')), 'Sun III');
    assert.equal(getDesignation(body('jupiter')), 'Sun V');
    assert.equal(getDesignation(body('phobos')), 'Mars I');
    assert.equal(getDesignation(body('deimos')), 'Mars II');
  });

  test('counts a focused dwarf planet among the planets', () => {
    assert.equal(getDesignation(body('pluto')), 'Sun IX');
  });

  test('falls back to the id for a body that orbits nothing in the catalogue', () => {
    assert.equal(getDesignation(body('sun')), 'SUN');
  });
});

describe('getPath', () => {
  test('lists what a body orbits, from the Milky Way in', () => {
    assert.deepEqual(getPath(body('phobos')), ['Milky Way', 'Sun', 'Mars']);
    assert.deepEqual(getPath(body('earth')), ['Milky Way', 'Sun']);
  });

  test('leaves star systems out', () => {
    assert.deepEqual(getPath(body('alpha-centauri-a')), ['Milky Way']);
  });
});

describe('getGauges', () => {
  test('fills every gauge from 0 to 1', () => {
    for (const id of ['earth', 'jupiter', 'io', 'moon', 'sun', 'pluto']) {
      Object.entries(getGauges(body(id))).forEach(([label, share]) =>
        assert.ok(share >= 0 && share <= 1, `${id} ${label} is ${share}`)
      );
    }
  });

  test('puts Jupiter at the top of the planets, and farther out than Earth', () => {
    const jupiter = getGauges(body('jupiter'));
    const earth = getGauges(body('earth'));

    assert.ok(jupiter.Radius > 0.99);
    assert.ok(jupiter['Semi-major axis'] > earth['Semi-major axis']);
    assert.ok(jupiter.Period > earth.Period);
    assert.equal(earth.Eccentricity, body('earth').orbit?.e);
  });

  test('has only a radius gauge for a body without an orbit', () => {
    assert.deepEqual(Object.keys(getGauges(body('sun'))), ['Radius']);
  });
});
