import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import {
  createStarfield,
  STARFIELD_LAYERS,
  type StarfieldStarInterface
} from '../generate-star-field';
import {
  getLayerTransform,
  moveStarfield,
  starfieldMotion,
  zoomStarfield
} from '../starfield-motion';

/** A seeded random number generator (mulberry32), so the stars repeat. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const STARS = createStarfield(1920, 1080, seeded(42));
const inLayer = (layer: number) => STARS.filter((star) => star.layer === layer);
const share = (stars: StarfieldStarInterface[]) =>
  stars.filter(({ redshifted }) => redshifted).length / stars.length;

describe('createStarfield', () => {
  test('makes each layer as many stars as the reference size asks', () => {
    assert.equal(inLayer(0).length, STARFIELD_LAYERS[0].count);
    assert.equal(inLayer(1).length, STARFIELD_LAYERS[1].count);
    assert.equal(inLayer(2).length, STARFIELD_LAYERS[2].count);
  });

  test('scales the counts with the area', () => {
    const quarter = createStarfield(960, 540, seeded(1));

    assert.equal(
      quarter.filter(({ layer }) => layer === 0).length,
      STARFIELD_LAYERS[0].count / 4
    );
  });

  test('places every star on the canvas, smaller the farther its layer', () => {
    for (const { x, y } of STARS) {
      assert.ok(x >= 0 && x < 1920 && y >= 0 && y < 1080);
    }

    for (const layer of [0, 1, 2] as const) {
      const [min, max] = STARFIELD_LAYERS[layer].size;

      for (const { size } of inLayer(layer)) {
        assert.ok(size >= min && size <= max, `${size} in layer ${layer}`);
      }
    }

    const largest = (layer: number) =>
      Math.max(...inLayer(layer).map(({ size }) => size));

    assert.ok(largest(0) < largest(1) && largest(1) < largest(2));
    // Many more faint far stars than near ones
    assert.ok(inLayer(0).length > inLayer(2).length * 10);
  });

  test('keeps the first starfield’s tints for the middle and near layers', () => {
    const colours = new Set(
      [...inLayer(1), ...inLayer(2)]
        .filter(({ redshifted }) => !redshifted)
        .map(({ color }) => color)
    );

    assert.deepEqual([...colours].sort(), [
      'rgba(170,170,255,0.3)',
      'rgba(200,200,255,0.5)',
      'rgba(220,220,255,0.7)',
      'rgba(255,255,255,0.9)'
    ]);
  });

  test('redshifts a share of the far and middle stars, red over blue, and none near', () => {
    assert.ok(
      Math.abs(share(inLayer(0)) - STARFIELD_LAYERS[0].redshift) < 0.02
    );
    assert.ok(
      Math.abs(share(inLayer(1)) - STARFIELD_LAYERS[1].redshift) < 0.02
    );
    assert.equal(share(inLayer(2)), 0);

    for (const { color } of STARS.filter(({ redshifted }) => redshifted)) {
      const [red, green, blue] = color.match(/[\d.]+/g)!.map(Number);

      assert.equal(red, 255);
      assert.ok(green < red && blue < green, color);
    }
  });
});

describe('the starfield’s parallax', () => {
  beforeEach(() => {
    Object.assign(starfieldMotion, { x: 0, y: 0, logZoom: 0 });
  });

  test('follows a pan, near layers more than far ones', () => {
    moveStarfield(100, -50, false);

    const far = getLayerTransform(0);
    const near = getLayerTransform(2);

    assert.deepEqual({ x: near.x, y: near.y }, { x: 10, y: -5 });
    assert.ok(Math.abs(far.x) < Math.abs(near.x));
  });

  test('follows a zoom, scaling the layers a little, and at most 28%', () => {
    zoomStarfield(Math.E, false);
    assert.ok(getLayerTransform(2).scale > getLayerTransform(0).scale);
    assert.ok(getLayerTransform(0).scale > 1);

    // A zoom through many orders of magnitude stays subtle
    zoomStarfield(1e30, false);
    assert.equal(getLayerTransform(2).scale, Math.exp(0.25));
    zoomStarfield(1e-90, false);
    assert.equal(getLayerTransform(2).scale, Math.exp(-0.25));
  });

  test('stays still with reduced motion, or a zoom that is no zoom', () => {
    moveStarfield(100, 100, true);
    zoomStarfield(2, true);
    zoomStarfield(0, false);
    zoomStarfield(Number.NaN, false);
    assert.deepEqual({ ...starfieldMotion }, { x: 0, y: 0, logZoom: 0 });
  });
});
