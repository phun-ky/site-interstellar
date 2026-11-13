import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ASTEROIDS,
  COMETS,
  MOONS,
  PLANETS,
  STARS,
  SYSTEMS
} from '@interstellar-tools/constants';

import { findBodyById, getBodyKind } from '../body-catalog';
import { getAbsolutePosition } from '../get-absolute-position';

const BODIES = [
  ...SYSTEMS,
  ...STARS,
  ...PLANETS,
  ...MOONS,
  ...COMETS,
  ...ASTEROIDS
];
/**
 * What a body can orbit outside the catalog: only the Milky Way, which the
 * map is placed round. Its black hole, Sagittarius A*, is in the catalog.
 */
const OUTSIDE_THE_CATALOG = new Set(['milky-way']);

describe('the body catalog (#103)', () => {
  test('knows every body, and the parent of each', () => {
    for (const body of BODIES) {
      assert.equal(findBodyById(body.id), body, `${body.id} is not found`);

      if (body.parent && !OUTSIDE_THE_CATALOG.has(body.parent)) {
        assert.ok(
          findBodyById(body.parent),
          `${body.id}'s parent ${body.parent} is not in the catalog`
        );
      }
    }
  });

  test('places every body, so every one can be drawn', () => {
    for (const body of BODIES) {
      const { x, y } = getAbsolutePosition(body);

      assert.ok(
        Number.isFinite(x.value) && Number.isFinite(y.value),
        `${body.id} has no position`
      );
    }
  });

  test('includes the bodies 2.x adds: TRAPPIST-1, Dimorphos, the S-stars', () => {
    assert.equal(findBodyById('trappist-1b')?.parent, 'trappist-1a');
    assert.equal(getBodyKind('trappist-1a'), 'star');
    assert.equal(
      getBodyKind(findBodyById('dimorphos')?.parent ?? ''),
      'asteroid'
    );
    assert.equal(
      STARS.filter(({ parent }) => parent === 'sagittarius-a-star').length,
      7
    );
  });
});
