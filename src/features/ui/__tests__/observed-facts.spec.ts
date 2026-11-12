import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  INTERSTELLAR_OBJECTS,
  PLANETS,
  STARS
} from '@interstellar-tools/constants';

import { getBodyFacts } from '../body-info';
import {
  getDiscoveryFacts,
  getRingFacts,
  getStarFacts,
  getTypeLabel
} from '../utils/observed-facts';

const star = (id: string) => STARS.find((body) => body.id === id)!;
const planet = (id: string) => PLANETS.find((body) => body.id === id)!;
const visitor = (id: string) =>
  INTERSTELLAR_OBJECTS.find((body) => body.id === id)!;

describe('getStarFacts', () => {
  test("lists a star's temperature and luminosity", () => {
    assert.deepEqual(getStarFacts(star('sun')), [
      ['Temperature', '5,772 K'],
      ['Luminosity', '1 L☉']
    ]);
    assert.deepEqual(getStarFacts(star('proxima-centauri')), [
      ['Temperature', '2,980 K'],
      ['Luminosity', '0.00151 L☉']
    ]);
  });

  test('leaves out what is not measured', () => {
    // Vega's temperature and Polaris's luminosity aren't given
    assert.deepEqual(
      getStarFacts(star('vega')).map(([label]) => label),
      ['Luminosity']
    );
    assert.deepEqual(
      getStarFacts(star('polaris')).map(([label]) => label),
      ['Temperature']
    );
    assert.deepEqual(getStarFacts(planet('earth')), []);
  });
});

describe('getTypeLabel', () => {
  test("calls a star's type its spectral class, and the rest's its type", () => {
    assert.equal(getTypeLabel(star('sun')), 'Spectral class');
    assert.equal(getTypeLabel(star('betelgeuse')), 'Spectral class');
    assert.equal(getTypeLabel(planet('earth')), 'Type');
    // A type that isn't the measured class stays a type
    assert.equal(
      getTypeLabel({
        type: 'Main sequence',
        observations: { spectralClassification: { raw: 'G2V' } }
      }),
      'Type'
    );
  });
});

describe('getRingFacts', () => {
  test('counts the giant planets’ rings, and nothing for the rest', () => {
    assert.deepEqual(getRingFacts(planet('saturn')), [['Rings', '9']]);
    assert.deepEqual(getRingFacts(planet('uranus')), [['Rings', '12']]);
    assert.deepEqual(getRingFacts(planet('earth')), []);
  });
});

describe('getDiscoveryFacts', () => {
  test('gives the day and the discoverers', () => {
    assert.deepEqual(getDiscoveryFacts(visitor('1i-oumuamua')), [
      ['Discovered', '2017-10-19 · R. Weryk']
    ]);
  });

  test('gives the facility, without its code, when no one is named', () => {
    assert.deepEqual(getDiscoveryFacts(visitor('3i-atlas')), [
      ['Discovered', '2025-07-01 · ATLAS Chile']
    ]);
  });

  test('takes a date as a string too, and nothing without one', () => {
    assert.deepEqual(
      getDiscoveryFacts({
        observations: { discovery: { date: '2019-08-30T00:00:00.000Z' } }
      }),
      [['Discovered', '2019-08-30']]
    );
    assert.deepEqual(getDiscoveryFacts(planet('earth')), []);
  });
});

describe('getBodyFacts', () => {
  test("names a star's class, and puts its measured facts after its radius", () => {
    assert.deepEqual(getBodyFacts(star('sun')), [
      ['Spectral class', 'G2V'],
      ['Orbits', 'Solar System'],
      ['Radius', '696K km'],
      ['Temperature', '5,772 K'],
      ['Luminosity', '1 L☉']
    ]);
  });

  test('ends with the rings, or the discovery', () => {
    assert.deepEqual(getBodyFacts(planet('saturn')).at(-1), ['Rings', '9']);
    assert.deepEqual(getBodyFacts(visitor('1i-oumuamua')).at(-1), [
      'Discovered',
      '2017-10-19 · R. Weryk'
    ]);
  });
});
