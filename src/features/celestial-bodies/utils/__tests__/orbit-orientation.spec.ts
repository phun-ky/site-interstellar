import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  AU_METERS,
  J2000_UTC,
  MOONS,
  PLANETS
} from '@interstellar-tools/constants';
import { orbitFrameToIcrf, stateAt } from '@interstellar-tools/equations';
import { OrbitInterface } from '@interstellar-tools/types';

import {
  applyMatrix,
  getEclipticPosition,
  getFlatPosition,
  getOrbitPosition3D,
  getPerifocalPosition,
  type Matrix3Type
} from '../orbit-orientation';

const close = (actual: number[], expected: number[], tolerance = 1e-9) =>
  actual.forEach((value, k) =>
    assert.ok(
      Math.abs(value - expected[k]) <= tolerance,
      `[${actual.join(', ')}] is not [${expected.join(', ')}]`
    )
  );
const orbitOf = (id: string): OrbitInterface => {
  const body = [...PLANETS, ...MOONS].find((candidate) => candidate.id === id);

  assert.ok(body?.orbit, `${id} has an orbit`);

  return body.orbit;
};
/** equations' own position at J2000, where the orbit's `angle` holds, in au, in the ICRF. */
const icrfAtJ2000 = (orbit: OrbitInterface) =>
  stateAt(orbit, J2000_UTC).r.map((metres) => metres / AU_METERS);

describe('the 3D orientation (#105)', () => {
  for (const id of ['mars', 'pluto', 'titan', 'triton', 'moon']) {
    test(`agrees with equations' stateAt for ${id}`, () => {
      const orbit = orbitOf(id);
      const ours = applyMatrix(
        orbitFrameToIcrf(orbit.frame!) as Matrix3Type,
        getOrbitPosition3D(orbit)
      );
      const expected = icrfAtJ2000(orbit);
      const size = Math.hypot(...expected);

      close(ours, expected, size * 1e-9);
    });
  }

  test('puts every placeable orbit in the ecliptic frame, the same distance away', () => {
    const titan = orbitOf('titan');
    const ecliptic = getEclipticPosition(titan);

    assert.ok(ecliptic);
    assert.ok(
      Math.abs(
        Math.hypot(...ecliptic) - Math.hypot(...getOrbitPosition3D(titan))
      ) < 1e-15
    );
    // Pluto is about 17° out of the ecliptic, so its height is real
    assert.ok(Math.abs(getEclipticPosition(orbitOf('pluto'))![2]) > 0.1);
  });

  test("can't place an orbit measured on the sky yet", () => {
    assert.equal(getEclipticPosition(orbitOf('trappist-1b')), null);
  });
});

describe('the flat orientation, as the 2D map draws it', () => {
  const plain: OrbitInterface = {
    a: { value: 2, unit: 'au' },
    e: 0.2,
    period: { value: 1000, unit: 'd' },
    angle: 1
  } as OrbitInterface;

  test('is where the map drew orbits before, without a node or periapsis', () => {
    const [x, y] = getPerifocalPosition(plain);

    // Prograde runs counter-clockwise on the canvas, retrograde clockwise
    close(getFlatPosition(plain), [x, -y]);
    close(getFlatPosition({ ...plain, retrograde: true }), [x, y]);
  });

  test('turns an orbit by its node plus its periapsis, and keeps it flat', () => {
    const turned = { ...plain, om: 30, w: 60, i: 40 } as OrbitInterface;
    const [x, y] = getPerifocalPosition(plain);
    // 90° turned: (x, y) becomes (-y, x), then y is flipped for the canvas
    close(getFlatPosition(turned), [-y, -x]);
  });

  test('turns a retrograde orbit the other way round its node', () => {
    const turned = { ...plain, om: 30, w: 60, i: 150 } as OrbitInterface;
    const [x, y] = getPerifocalPosition(plain);
    const angle = (30 * Math.PI) / 180;
    const along = Math.atan2(-y, x) + angle - (60 * Math.PI) / 180;
    const r = Math.hypot(x, y);

    close(getFlatPosition(turned), [r * Math.cos(along), -r * Math.sin(along)]);
  });

  test('places a body on an open orbit, at its periapsis distance', () => {
    const open = {
      a: { value: -1.283872207, unit: 'au' },
      e: 1.199436003,
      angle: 0
    } as OrbitInterface;

    close(getPerifocalPosition(open), [0.2560503413, 0, 0], 1e-9);
  });
});
