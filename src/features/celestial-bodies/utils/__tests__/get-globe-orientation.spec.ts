import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PLANETS, STARS } from '@interstellar-tools/constants';
import {
  applyMatrix3,
  rot1,
  subsolarPoint,
  transpose3
} from '@interstellar-tools/equations';

import { getGlobeOrientation, getSpinPerFrame } from '../get-globe-orientation';
import { OBLIQUITY, type Vector3Type } from '../orbit-orientation';

const mars = PLANETS.find((planet) => planet.id === 'mars')!;
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
