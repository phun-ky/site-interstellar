import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { OrbitInterface } from '@interstellar-tools/types';

import { AU_IN_PX } from '../../../../config/constants';
import { getFlatPosition } from '../../utils/orbit-orientation';
import { traceOrbit } from '../trace-orbit';

const WIDTH = 1000;
const HEIGHT = 1000;
const CENTRE = 500;

/** Traces an orbit on a canvas that only records its points. */
const trace = (orbit: OrbitInterface, pxPerAu: number): [number, number][] => {
  const points: [number, number][] = [];
  const space = {
    moveTo: (x: number, y: number) => points.push([x, y]),
    lineTo: (x: number, y: number) => points.push([x, y])
  } as unknown as CanvasRenderingContext2D;

  traceOrbit(
    space,
    orbit,
    CENTRE,
    CENTRE,
    { value: pxPerAu / AU_IN_PX },
    WIDTH,
    HEIGHT
  );

  return points;
};
/** How far a point is from the traced path, in pixels: its nearest segment. */
const distanceToPath = (
  points: [number, number][],
  [x, y]: [number, number]
): number => {
  let nearest = Infinity;

  for (let k = 1; k < points.length; k++) {
    const [[x0, y0], [x1, y1]] = [points[k - 1], points[k]];
    const length = (x1 - x0) ** 2 + (y1 - y0) ** 2;
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / length)
        )
      : 0;

    nearest = Math.min(
      nearest,
      Math.hypot(x0 + t * (x1 - x0) - x, y0 + t * (y1 - y0) - y)
    );
  }

  return nearest;
};

const ellipse = {
  a: { value: 2, unit: 'au' },
  e: 0.4,
  period: { value: 1000, unit: 'd' },
  angle: 0,
  om: 50,
  w: 70,
  i: 10
} as OrbitInterface;
const hyperbola = {
  a: { value: -1.283872207, unit: 'au' },
  e: 1.199436003,
  angle: 0,
  om: 24.6,
  w: 241.84,
  i: 122.74,
  retrograde: true
} as OrbitInterface;

describe('traceOrbit (#105)', () => {
  for (const [name, orbit, pxPerAu] of [
    ['a turned ellipse', ellipse, 100],
    ['a retrograde hyperbola', hyperbola, 100]
  ] as const) {
    test(`passes through the body, wherever it is on ${name}`, () => {
      const points = trace(orbit, pxPerAu);

      for (const angle of [-1.5, -0.8, 0, 0.5, 1.2]) {
        const [x, y] = getFlatPosition(orbit, angle);
        const onCanvas: [number, number] = [
          CENTRE + x * pxPerAu,
          CENTRE + y * pxPerAu
        ];

        assert.ok(
          distanceToPath(points, onCanvas) < 1,
          `${name} misses the body at ${angle} rad by ${distanceToPath(points, onCanvas).toFixed(2)} px`
        );
      }
    });
  }

  test('traces an open orbit as one open curve, not round', () => {
    const points = trace(hyperbola, 100);
    const [first, last] = [points[0], points.at(-1)!];

    // Its two ends are far apart, leaving the view on opposite sides of the Sun
    assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) > WIDTH / 2);
  });
});
