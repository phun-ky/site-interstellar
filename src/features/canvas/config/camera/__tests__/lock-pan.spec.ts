import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import {
  centreLocked,
  isOffCentre,
  LOCK_PAN_CHANGE,
  lockPan,
  panLocked,
  zoomLockPan
} from '../lock-pan';

/** Counts the LOCK_PAN_CHANGE events dispatched while `run` runs. */
const countChanges = (run: () => void): number => {
  const target = new EventTarget();
  const previous = globalThis.document;
  let count = 0;

  target.addEventListener(LOCK_PAN_CHANGE, () => count++);
  Object.defineProperty(globalThis, 'document', {
    value: target,
    configurable: true
  });

  try {
    run();
  } finally {
    Object.defineProperty(globalThis, 'document', {
      value: previous,
      configurable: true
    });
  }

  return count;
};

beforeEach(() => centreLocked());

describe('panLocked', () => {
  test('adds up the pointer’s movement', () => {
    panLocked(30, -10);
    panLocked(5, 5);

    assert.deepEqual({ ...lockPan }, { x: 35, y: -5 });
    assert.equal(isOffCentre(), true);
  });

  test('tells the page only when the view moves off the body, or back', () => {
    assert.equal(
      countChanges(() => {
        panLocked(10, 0); // off
        panLocked(10, 0); // still off
        centreLocked(); // back
        centreLocked(); // still centred
      }),
      2
    );
  });
});

describe('zoomLockPan', () => {
  test('keeps the point zoomed around where it is', () => {
    panLocked(100, 50);
    // The body is 100 px right of the middle; zooming 2× round a point
    // 40 px right of it puts the body twice as far from that point
    zoomLockPan(2, 40, 0);

    assert.deepEqual({ ...lockPan }, { x: 160, y: 100 });
  });

  test('zooming round the middle scales the gap', () => {
    panLocked(-20, 30);
    zoomLockPan(0.5, 0, 0);

    assert.deepEqual({ ...lockPan }, { x: -10, y: 15 });
  });

  test('a centred body stays centred, wherever the pointer is', () => {
    zoomLockPan(3, 200, -150);

    assert.deepEqual({ ...lockPan }, { x: 0, y: 0 });
    assert.equal(isOffCentre(), false);
  });
});

describe('centreLocked', () => {
  test('puts the body back in the middle at once', () => {
    panLocked(80, 80);
    centreLocked();

    assert.deepEqual({ ...lockPan }, { x: 0, y: 0 });
    assert.equal(isOffCentre(), false);
  });

  test('less than half a pixel off counts as centred', () => {
    panLocked(0.3, 0.3);

    assert.equal(isOffCentre(), false);
  });
});
