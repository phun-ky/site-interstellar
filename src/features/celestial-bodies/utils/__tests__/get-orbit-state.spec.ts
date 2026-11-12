import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { OrbitInterface, Radians } from '@interstellar-tools/types';

import { getOrbitState } from '../get-orbit-state';

/** Kilometres in an au, and seconds in a day. */
const KM_PER_AU = 149_597_870.7;
const SECONDS_PER_DAY = 86_400;
const bodyAt = (angle: number, a = 1, e = 0, days = 365.25) => ({
  id: 'test-body',
  name: 'Test body',
  kind: 'planetary' as const,
  orbit: {
    a: { value: a, unit: 'au' },
    e,
    period: { value: days, unit: 'd' },
    angle: angle as Radians
  } as OrbitInterface
});
const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} is not ${expected}`
  );

describe('getOrbitState', () => {
  test('a circular orbit has its radius as range, and goes round once a period', () => {
    const { range, speed } = getOrbitState(bodyAt(1));
    const circumferenceKm = 2 * Math.PI * KM_PER_AU;

    close(range, 1);
    close(speed ?? 0, circumferenceKm / (365.25 * SECONDS_PER_DAY), 1e-6);
  });

  test('is (1 + e) / (1 - e) times faster at perihelion than at aphelion (vis-viva)', () => {
    const e = 0.5;
    const perihelion = getOrbitState(bodyAt(0, 2, e));
    const aphelion = getOrbitState(bodyAt(Math.PI, 2, e));

    close(perihelion.range, 2 * (1 - e));
    close(aphelion.range, 2 * (1 + e));
    close((perihelion.speed ?? 0) / (aphelion.speed ?? 1), (1 + e) / (1 - e));
  });

  // Prograde orbits run anticlockwise on screen, seen from the north, and
  // the bearing is clockwise from up, so a quarter orbit on is 90° back
  test('gives the bearing in degrees from 0 to 360, 90° back a quarter orbit on', () => {
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.3) {
      const { bearing } = getOrbitState(bodyAt(angle));
      const later = getOrbitState(bodyAt(angle + Math.PI / 2)).bearing;

      assert.ok(bearing >= 0 && bearing < 360, `${bearing} is out of range`);
      close((((bearing - later) % 360) + 360) % 360, 90, 1e-6);
    }
  });

  test('has no speed without an orbit, at its parent', () => {
    const state = getOrbitState({ id: 'still', name: 'Still' } as never);

    assert.equal(state.range, 0);
    assert.equal(state.speed, null);
  });
});
