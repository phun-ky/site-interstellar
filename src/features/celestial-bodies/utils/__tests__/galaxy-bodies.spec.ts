import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { AU_PER_LY, GALAXIES } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';

import { getGalaxyBodies } from '../galaxy-bodies';

/** The Sun on the map, 26 000 ly below the centre, moving right. */
const SUN: [number, number] = [0, -26_000 * AU_PER_LY];
const MOTION: [number, number] = [1, 0];

describe('the galaxies, placed on the map (#105)', () => {
  const bodies = getGalaxyBodies(GALAXIES, SUN, MOTION);

  test('places every galaxy with a direction: all but the Milky Way', () => {
    assert.deepEqual(
      bodies.map(({ id }) => id),
      GALAXIES.filter(({ direction }) => direction).map(({ id }) => id)
    );
    assert.equal(bodies.length, 7);
  });

  for (const galaxy of GALAXIES.filter(({ direction }) => direction)) {
    test(`puts ${galaxy.name} at its galactic longitude from the Sun, no farther than its distance`, () => {
      const body = bodies.find(({ id }) => id === galaxy.id)!;
      const dx = body.position.x.value - SUN[0];
      const dy = body.position.y.value - SUN[1];
      // Towards the centre is up the map (0, 1); the Milky Way turns right (1, 0)
      const longitude = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
      const away = Math.hypot(dx, dy) / AU_PER_LY;

      // Within 0.2° in the plane: the galactocentric frame is tilted a little
      // against the Sun's galactic one, as the Sun is about 20 pc above the
      // plane, and the nearer the pole a galaxy is, the more that turns it
      const tolerance = 0.2 / Math.cos((galaxy.direction!.b * Math.PI) / 180);

      assert.ok(
        Math.abs(longitude - galaxy.direction!.l) < tolerance,
        `${longitude} is not ${galaxy.direction!.l}`
      );
      // Seen from above the plane, so out of it means nearer
      assert.ok(
        away <= convertDistanceUnit(galaxy.distance, 'ly').value * (1 + 1e-12)
      );
      assert.equal(
        body.radius.value * 2,
        convertDistanceUnit(galaxy.diameter, 'ly').value
      );
    });
  }
});
