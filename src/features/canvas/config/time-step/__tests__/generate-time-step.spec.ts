import assert from 'node:assert';
import { test, beforeEach, afterEach, describe } from 'node:test';

import { lastTimestamp, SPEED_MODE, timeStep } from '..';
import { MILLISECONDS_PER_DAY } from '@interstellar-tools/constants';
import { generateTimeStep } from '../generate-time-step';

// Mock `performance.now()`
let mockNow = 0;

globalThis.performance = {
  now: () => mockNow
} as Performance;

describe('generateTimeStep', () => {
  beforeEach(() => {
    lastTimestamp.value = 0;
    timeStep.value = 0;
    timeStep.unit = 'd';
  });

  afterEach(() => {
    lastTimestamp.value = 0;
    timeStep.value = 0;
    timeStep.unit = 'd';
  });

  test("real time is the frame's own length, at any refresh rate", () => {
    SPEED_MODE.value = 'realTime';

    // 60Hz, 144Hz and 30Hz frames: a second of frames is a second of time
    for (const frame of [1000 / 60, 1000 / 144, 1000 / 30]) {
      lastTimestamp.value = 0;
      mockNow = frame;
      generateTimeStep();

      assert.strictEqual(timeStep.unit, 'd');
      assert.ok(
        Math.abs((timeStep.value * MILLISECONDS_PER_DAY) / frame - 1) < 1e-12
      );
    }
  });

  test('a long gap, after a hold or a stalled tab, counts as 250 ms', () => {
    SPEED_MODE.value = 'realTime';
    mockNow = 60_000;
    generateTimeStep();

    assert.strictEqual(timeStep.value, 250 / MILLISECONDS_PER_DAY);
  });

  test('Speed Modes', () => {
    mockNow = 16.67; // 60Hz frame time

    const speedModes = {
      quarterFramePerDay: 0.25,
      framePerDay: 1,
      spedUp: 10,
      insane: 1000
    };

    for (const [mode, expected] of Object.entries(speedModes)) {
      SPEED_MODE.value = mode as
        'realTime' | 'framePerDay' | 'quarterFramePerDay' | 'spedUp' | 'insane';
      generateTimeStep();
      assert.strictEqual(timeStep.unit, 'd');
      assert.strictEqual(timeStep.value, expected);
    }
  });
});
