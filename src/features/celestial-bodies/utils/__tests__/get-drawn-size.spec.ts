import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { AU_IN_PX } from '../../../../config/constants';
import { findBodyById } from '../body-catalog';
import { getDrawnSize, getTierSize, SIZE_BANDS } from '../get-drawn-size';

const body = (id: string) => {
  const found = findBodyById(id);

  assert.ok(found, `${id} is in the catalog`);

  return found;
};
/** A scale where 1 au is this many pixels. */
const pxPerAu = (px: number) => ({ value: px / AU_IN_PX });
/** Far out: every body is far under a pixel across. */
const FAR = pxPerAu(1e-3);

describe('the size a body is drawn at (#109)', () => {
  test('larger bodies are drawn larger, kind by kind', () => {
    const sizes = Object.fromEntries(
      [
        'sun',
        'jupiter',
        'earth',
        'mercury',
        'ganymede',
        'europa',
        '1p-halley'
      ].map((id) => [id, getTierSize(body(id))])
    );

    assert.ok(sizes.sun > sizes.jupiter);
    assert.ok(sizes.jupiter > sizes.earth);
    assert.ok(sizes.earth > sizes.mercury);
    assert.ok(sizes.ganymede > sizes.europa);
    assert.ok(sizes.europa > sizes['1p-halley']);
  });

  test("stays inside its kind's band", () => {
    for (const [id, band] of [
      ['sun', SIZE_BANDS.star],
      ['betelgeuse', SIZE_BANDS.star],
      ['jupiter', SIZE_BANDS.planet],
      ['ceres', SIZE_BANDS.planet],
      ['moon', SIZE_BANDS.moon],
      ['101955-bennu', SIZE_BANDS.small],
      ['1i-oumuamua', SIZE_BANDS.small]
    ] as const) {
      const size = getTierSize(body(id));

      assert.ok(size >= band.px[0] && size <= band.px[1], `${id} is ${size}`);
    }
  });

  test('is its tier size far out, and blends into its true size close up', () => {
    const jupiter = body('jupiter');

    assert.ok(
      Math.abs(getDrawnSize(jupiter, FAR, 0) - getTierSize(jupiter)) < 0.01
    );

    // Close enough that Jupiter is 400 px across: within half a percent of it
    const close = pxPerAu(400 / 0.000467);
    const drawn = getDrawnSize(jupiter, close, 0);

    assert.ok(drawn >= 400 && drawn < 400 * 1.005, `${drawn}`);
  });

  test('shrinks while crowded against its parent, to half its tier size at most', () => {
    const star = body('alpha-centauri-a');
    const tier = getTierSize(star);

    assert.ok(Math.abs(getDrawnSize(star, FAR, 0.5) - tier / 2) < 0.01);
    assert.ok(Math.abs(getDrawnSize(star, FAR, 6 * tier) - tier) < 0.01);
    assert.ok(
      Math.abs(getDrawnSize(star, FAR, 4.5 * tier) - tier * 0.75) < 0.01
    );
    // No parent drawn apart from it: full size
    assert.ok(Math.abs(getDrawnSize(star, FAR, 0) - tier) < 0.01);
  });

  test('is never under a pixel', () => {
    assert.ok(getDrawnSize(body('101955-bennu'), FAR, 0.1) >= 1);
  });
});
