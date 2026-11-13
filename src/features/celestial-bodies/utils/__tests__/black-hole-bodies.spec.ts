import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { GALAXIES, STARS } from '@interstellar-tools/constants';

import { getBlackHoleBodies, toBlackHoleId } from '../black-hole-bodies';
import {
  BLACK_HOLE_BODIES,
  findBodyById,
  getBodyKind,
  getChildBodies
} from '../body-catalog';
import { getAbsolutePosition } from '../get-absolute-position';
import { isInside } from '../is-inside-galaxy';

describe('getBlackHoleBodies', () => {
  test("makes a body of each galaxy's black hole, on its galaxy", () => {
    assert.deepEqual(
      getBlackHoleBodies(GALAXIES).map(({ id, name, parent }) => [
        id,
        name,
        parent
      ]),
      [
        ['sagittarius-a-star', 'Sagittarius A*', 'milky-way'],
        ['m31-star', 'M31*', 'andromeda'],
        ['m87-star', 'M87*', 'm87'],
        ['centaurus-a-star', 'Centaurus A*', 'centaurus-a']
      ]
    );
  });

  test('gives each its mass and event horizon, with no orbit', () => {
    const [sgrA, , m87] = BLACK_HOLE_BODIES;

    assert.deepEqual(sgrA.mass, { value: 4_299_600, unit: 'M_sun' });
    assert.deepEqual(m87.mass, { value: 6.5e9, unit: 'M_sun' });
    assert.equal(sgrA.radius.unit, 'au');
    assert.equal(sgrA.category, 'black hole');
    assert.equal(sgrA.orbit, undefined);
  });

  test("takes its own distance, or else its galaxy's", () => {
    const [sgrA, , m87] = BLACK_HOLE_BODIES;

    assert.deepEqual(sgrA.distance, { value: 26_992.38, unit: 'ly' });
    assert.deepEqual(
      m87.distance,
      GALAXIES.find(({ id }) => id === 'm87')?.distance
    );
  });
});

describe('toBlackHoleId', () => {
  test('names a black hole as Sagittarius A* is named', () => {
    assert.equal(toBlackHoleId('Sagittarius A*'), 'sagittarius-a-star');
    assert.equal(toBlackHoleId('M87*'), 'm87-star');
    assert.equal(toBlackHoleId('Centaurus A*'), 'centaurus-a-star');
  });
});

describe('the black holes in the body catalog', () => {
  test('are found, as black holes, and are where their galaxies are', () => {
    for (const blackHole of BLACK_HOLE_BODIES) {
      assert.equal(findBodyById(blackHole.id), blackHole);
      assert.equal(getBodyKind(blackHole.id), 'blackHole');
    }

    const m87 = findBodyById('m87');

    assert.ok(m87);
    assert.deepEqual(
      getAbsolutePosition(BLACK_HOLE_BODIES[2]),
      getAbsolutePosition(m87)
    );
    // Sagittarius A* is the Milky Way's centre, where the map is placed from
    assert.deepEqual(getAbsolutePosition(BLACK_HOLE_BODIES[0]), {
      x: { value: 0, unit: 'au' },
      y: { value: 0, unit: 'au' }
    });
  });

  test('Sagittarius A* is orbited by the S-stars', () => {
    assert.deepEqual(
      getChildBodies('sagittarius-a-star').map(({ id }) => id),
      STARS.filter(({ parent }) => parent === 'sagittarius-a-star').map(
        ({ id }) => id
      )
    );
    assert.equal(getChildBodies('sagittarius-a-star').length, 7);
  });
});

describe('isInside', () => {
  /** A canvas as wide and high as the map's on a 1440 x 900 window. */
  const space = {
    canvas: { clientWidth: 1440, clientHeight: 836 }
  } as CanvasRenderingContext2D;
  /** Half the canvas's diagonal: from its middle to a corner. */
  const corner = Math.hypot(1440, 836) / 2;

  test('is inside a galaxy whose disc covers the whole canvas', () => {
    assert.equal(isInside(space, 720, 418, corner + 1), true);
    assert.equal(isInside(space, 720, 418, corner - 1), false);
  });

  test('is not inside a large galaxy whose disc is elsewhere', () => {
    // Centaurus A, huge on screen but off to the side
    assert.equal(isInside(space, 720 + 5000, 418, 4000), false);
    assert.equal(isInside(space, 720 + 100, 418, corner + 101), true);
  });
});
