import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  INTERSTELLAR_OBJECTS,
  MOONS,
  PLANETS,
  STARS
} from '@interstellar-tools/constants';

import { getBodyFacts } from '../body-info';
import {
  formatRotation,
  getDiscoveryFacts,
  getRingFacts,
  getRotationFacts,
  getStarFacts,
  getTypeLabel
} from '../utils/observed-facts';

const star = (id: string) => STARS.find((body) => body.id === id)!;
const planet = (id: string) => PLANETS.find((body) => body.id === id)!;
const moon = (id: string) => MOONS.find((body) => body.id === id)!;
const visitor = (id: string) =>
  INTERSTELLAR_OBJECTS.find((body) => body.id === id)!;

describe('getStarFacts', () => {
  test("lists a star's mass, temperature, luminosity, gravity and metallicity", () => {
    assert.deepEqual(getStarFacts(star('sun')), [
      ['Mass', '1 M☉'],
      ['Temperature', '5,772 K'],
      ['Luminosity', '1 L☉'],
      ['Surface gravity', 'log g 4.438'],
      ['Metallicity', '[Fe/H] 0.00']
    ]);
    assert.deepEqual(getStarFacts(star('proxima-centauri')), [
      ['Mass', '0.1221 M☉'],
      ['Temperature', '2,980 K'],
      ['Luminosity', '0.00151 L☉'],
      ['Surface gravity', 'log g 5.02'],
      ['Metallicity', '[Fe/H] -0.07']
    ]);
  });

  test('signs a metallicity above the Sun’s', () => {
    assert.deepEqual(getStarFacts(star('alpha-centauri-a')).at(-1), [
      'Metallicity',
      '[Fe/H] +0.24'
    ]);
  });

  test('leaves out what is not measured', () => {
    // Vega's temperature and Polaris's luminosity aren't given
    assert.deepEqual(
      getStarFacts(star('vega')).map(([label]) => label),
      ['Mass', 'Luminosity', 'Surface gravity']
    );
    assert.deepEqual(
      getStarFacts(star('polaris')).map(([label]) => label),
      ['Mass', 'Temperature', 'Surface gravity', 'Metallicity']
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

describe('getRotationFacts', () => {
  test('gives the period, in hours below two days', () => {
    assert.deepEqual(getRotationFacts(planet('earth')), [
      ['Rotation', '23.93 h']
    ]);
    assert.equal(formatRotation({ value: 1.99, unit: 'd' }), '47.76 h');
    assert.equal(formatRotation({ value: 2, unit: 'd' }), '2 d');
    assert.equal(formatRotation({ value: 30.56, unit: 'h' }), '30.56 h');
  });

  test('says how it turns: backwards, locked or tumbling', () => {
    assert.deepEqual(getRotationFacts(planet('venus')), [
      ['Rotation', '243 d · retrograde']
    ]);
    assert.deepEqual(getRotationFacts(moon('moon')), [
      ['Rotation', '27.32 d · tidally locked']
    ]);
    assert.deepEqual(
      getRotationFacts({
        rotation: {
          period: { value: 30.56, unit: 'h' },
          retrograde: true,
          tumbling: true
        }
      }),
      [['Rotation', '30.56 h · retrograde · tumbling']]
    );
  });

  test("gives the Sun's period at its equator and its poles", () => {
    assert.deepEqual(getRotationFacts(star('sun')), [
      ['Rotation', '25.38 d'],
      ['At the equator', '24.47 d'],
      ['At the poles', '34.16 d']
    ]);
  });

  test('tells a tumbling body, and gives nothing without a rotation', () => {
    // ʻOumuamua has no fixed axis
    assert.deepEqual(getRotationFacts(visitor('1i-oumuamua')), [
      ['Rotation', '8.67 h · tumbling']
    ]);
    assert.deepEqual(getRotationFacts({}), []);
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
      ['Mass', '1 M☉'],
      ['Temperature', '5,772 K'],
      ['Luminosity', '1 L☉'],
      ['Surface gravity', 'log g 4.438'],
      ['Metallicity', '[Fe/H] 0.00'],
      ['Rotation', '25.38 d'],
      ['At the equator', '24.47 d'],
      ['At the poles', '34.16 d']
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
