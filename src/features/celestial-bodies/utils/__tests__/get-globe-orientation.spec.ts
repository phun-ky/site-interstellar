import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { MOONS, PLANETS, STARS } from '@interstellar-tools/constants';
import {
  applyMatrix3,
  rot1,
  subsolarPoint,
  transpose3
} from '@interstellar-tools/equations';

import { getGlobeOrientation, getSpinPerFrame } from '../get-globe-orientation';
import {
  getEclipticPosition,
  OBLIQUITY,
  type Vector3Type
} from '../orbit-orientation';
import { precomputeInitialAngles } from '../precompute-initial-angles';

const mars = PLANETS.find((planet) => planet.id === 'mars')!;
const earth = PLANETS.find((planet) => planet.id === 'earth')!;
const moon = MOONS.find(({ id }) => id === 'moon')!;
const date = new Date('2026-06-20T23:58:50.816Z');
const DEG = 180 / Math.PI;

describe('getGlobeOrientation', () => {
  const orientation = getGlobeOrientation(mars, date);

  test('gives Mars an orientation', () => {
    assert.ok(orientation);
  });

  test('is a rotation: its rows are of length 1', () => {
    orientation!.toView.forEach((row) =>
      assert.ok(Math.abs(Math.hypot(...row) - 1) < 1e-12)
    );
  });

  test("tilts Mars's north pole about 26° from the ecliptic's, towards the viewer", () => {
    const [, , z] = applyMatrix3(orientation!.toView, [0, 0, 1]);
    const tilt = Math.acos(z) * DEG;

    assert.ok(tilt > 24 && tilt < 28, `tilt ${tilt}°`);
  });

  test("lights the place equations' subsolarPoint puts the Sun over", () => {
    const { toView, sun } = orientation!;
    const [x, y, z] = applyMatrix3(transpose3(toView), sun);
    const sunIcrf = applyMatrix3(rot1(OBLIQUITY), sun) as Vector3Type;
    const expected = subsolarPoint(mars.rotation!.iau!, sunIcrf, date);
    const longitude = (Math.atan2(y, x) * DEG + 360) % 360;

    assert.ok(Math.abs(Math.asin(z) * DEG - expected.latitude) < 1e-9);
    assert.ok(Math.abs(longitude - expected.longitude) < 1e-9);
  });

  test('gives the Sun, which has no orbit here, none', () => {
    const sun = STARS.find((star) => star.id === 'sun')!;

    assert.equal(getGlobeOrientation(sun, date), null);
  });

  test('gives none before the rotation models start', () => {
    assert.equal(getGlobeOrientation(mars, new Date('1960-01-01')), null);
  });

  test('turns Mars by its 350.89° a day, a quarter of that at 1/4 day a frame', () => {
    assert.ok(Math.abs(getSpinPerFrame(mars, 1) - 350.891982443297) < 1e-9);
    assert.ok(Math.abs(getSpinPerFrame(mars, 0.25) - 87.72299561) < 1e-6);
  });

  test('turns a body without a rotation model by nothing', () => {
    assert.equal(getSpinPerFrame({ ...mars, rotation: undefined }, 1), 0);
  });

  test('keeps the sun direction of length 1', () => {
    assert.ok(Math.abs(Math.hypot(...orientation!.sun) - 1) < 1e-12);
  });
});

describe('getGlobeOrientation, for the Moon', () => {
  // Where the app puts them at the date, as it does when it starts
  precomputeInitialAngles([moon, earth], date);

  const orientation = getGlobeOrientation(moon, date)!;

  test('lights it from the Sun, where Earth is, not from Earth', () => {
    const fromEarth = getGlobeOrientation(earth, date)!.sun;
    const angle = Math.acos(
      fromEarth.reduce(
        (sum, value, axis) => sum + value * orientation.sun[axis],
        0
      )
    );

    // The Moon is 0.0026 au from Earth: the Sun is within 0.2° of Earth's
    assert.ok(angle * DEG < 0.2, `${angle * DEG}°`);
  });

  test("lights the place equations' subsolarPoint puts the Sun over", () => {
    const { toView, sun } = orientation;
    const [x, y, z] = applyMatrix3(transpose3(toView), sun);
    const sunIcrf = applyMatrix3(rot1(OBLIQUITY), sun) as Vector3Type;
    const expected = subsolarPoint(moon.rotation!.iau!, sunIcrf, date);
    const longitude = (Math.atan2(y, x) * DEG + 360) % 360;

    assert.ok(Math.abs(Math.asin(z) * DEG - expected.latitude) < 1e-9);
    assert.ok(Math.abs(longitude - expected.longitude) < 1e-9);
  });

  test('turns its near side, round 0° longitude, towards Earth', () => {
    const [x, y, z] = getEclipticPosition(moon.orbit)!;
    const length = Math.hypot(x, y, z);
    const [bx, by, bz] = applyMatrix3(transpose3(orientation.toView), [
      -x / length,
      -y / length,
      -z / length
    ]);

    // Within its libration, about 8°, give or take the simulation's
    // Keplerian Moon
    assert.ok(Math.abs(Math.atan2(by, bx) * DEG) < 10);
    assert.ok(Math.abs(Math.asin(bz) * DEG) < 10);
  });
});
