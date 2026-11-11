import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  INTERSTELLAR_OBJECTS,
  J2000_UTC,
  STARS
} from '@interstellar-tools/constants';

import { getOpenOrbitTrueAnomaly, solveHyperbolicKepler } from '../open-orbit';

const SUN_MU = STARS.find(({ id }) => id === 'sun')?.mu as number;

describe('open orbits (#105)', () => {
  test("solves Kepler's hyperbolic equation", () => {
    for (const [M, e] of [
      [0, 1.2],
      [0.5, 1.2],
      [-40, 3.36],
      [5000, 6.1]
    ]) {
      const F = solveHyperbolicKepler(M, e);

      assert.ok(
        Math.abs(e * Math.sinh(F) - F - M) < 1e-9 * Math.max(1, Math.abs(M))
      );
    }
  });

  for (const body of INTERSTELLAR_OBJECTS) {
    test(`puts ${body.name} where the dataset has it at J2000, and at periapsis on its periapsis time`, () => {
      // Far out on the way in: 1e-9 rad is minutes of time, so a close match
      assert.ok(
        Math.abs(
          getOpenOrbitTrueAnomaly(body.orbit, J2000_UTC, SUN_MU) -
            body.orbit.angle
        ) < 1e-6
      );
      assert.ok(
        Math.abs(
          getOpenOrbitTrueAnomaly(body.orbit, body.orbit.periapsisTime, SUN_MU)
        ) < 1e-9
      );
    });
  }

  test('runs from the asymptote in to the asymptote out, never past them', () => {
    const [oumuamua] = INTERSTELLAR_OBJECTS;
    const limit = Math.acos(-1 / oumuamua.orbit.e);
    const early = getOpenOrbitTrueAnomaly(
      oumuamua.orbit,
      new Date('1000-01-01'),
      SUN_MU
    );
    const late = getOpenOrbitTrueAnomaly(
      oumuamua.orbit,
      new Date('3000-01-01'),
      SUN_MU
    );

    assert.ok(early < 0 && early > -limit);
    assert.ok(late > 0 && late < limit);
  });
});
