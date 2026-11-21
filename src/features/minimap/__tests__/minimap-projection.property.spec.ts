import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import fc from 'fast-check';

import { MILKY_WAY_RADIUS_AU } from '../utils/get-minimap-context';
import {
  FILL,
  getNeighbourReach,
  toGalaxyMap,
  toNeighbourMap
} from '../utils/minimap-projection';

const size = fc.integer({ min: 16, max: 2000 });
const coordinate = fc.double({
  min: -MILKY_WAY_RADIUS_AU,
  max: MILKY_WAY_RADIUS_AU,
  noNaN: true
});
const inGalaxy = fc
  .tuple(coordinate, coordinate)
  .filter(([x, y]) => Math.hypot(x, y) <= MILKY_WAY_RADIUS_AU);
// From nearer than the nearest neighbour to past the farthest, so both ends clamp
const away = fc.double({ min: 1e6, max: 1e14, noNaN: true });
const direction = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true });
const reach = getNeighbourReach();
const TOLERANCE = 1e-9;

describe('minimap projection properties', () => {
  it('keeps any point in the Milky Way within the drawn disc', () => {
    fc.assert(
      fc.property(inGalaxy, size, ([x, y], width) => {
        const { x: px, y: py } = toGalaxyMap({ x, y }, width);
        const radius = Math.hypot(px - width / 2, py - width / 2);

        assert.ok(radius <= (width / 2) * FILL + TOLERANCE, `got ${radius}`);
      })
    );
  });

  it('draws any neighbour in its own direction, in the ring between 0.32 and FILL', () => {
    fc.assert(
      fc.property(away, direction, size, (distance, angle, width) => {
        const mid = width / 2;
        const { x, y } = toNeighbourMap(
          { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
          width,
          reach
        );
        const radius = Math.hypot(x - mid, y - mid);

        assert.ok(radius >= mid * 0.32 - TOLERANCE, `got ${radius}`);
        assert.ok(radius <= mid * FILL + TOLERANCE, `got ${radius}`);
        assert.ok(Math.abs((x - mid) / radius - Math.cos(angle)) < TOLERANCE);
        assert.ok(Math.abs((y - mid) / radius - Math.sin(angle)) < TOLERANCE);
      })
    );
  });

  it('never draws a farther neighbour nearer the middle', () => {
    fc.assert(
      fc.property(away, away, direction, size, (a, b, angle, width) => {
        const mid = width / 2;
        const radius = (distance: number) => {
          const { x, y } = toNeighbourMap(
            { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
            width,
            reach
          );

          return Math.hypot(x - mid, y - mid);
        };
        const [near, far] = a < b ? [a, b] : [b, a];

        assert.ok(radius(near) <= radius(far) + TOLERANCE);
      })
    );
  });
});
