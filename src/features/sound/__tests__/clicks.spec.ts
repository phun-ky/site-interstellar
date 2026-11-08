import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getSwitchClicks,
  getZoomTick,
  isTickDue,
  ZOOM_TICK_INTERVAL
} from '../utils/clicks';

describe('getSwitchClicks', () => {
  test('the release is higher when switched on, lower when switched off', () => {
    const [onPress, onRelease] = getSwitchClicks(true);
    const [offPress, offRelease] = getSwitchClicks(false);

    assert.ok(onRelease.frequency > onPress.frequency);
    assert.ok(offRelease.frequency < offPress.frequency);
  });

  test('are two short clicks, the release softer, all over in a twentieth of a second', () => {
    for (const on of [true, false]) {
      const [press, release] = getSwitchClicks(on);

      assert.equal(press.start, 0);
      assert.ok(release.start >= press.start + press.duration);
      assert.ok(release.gain < press.gain);
      assert.ok(release.start + release.duration <= 0.05);
    }
  });
});

describe('getZoomTick', () => {
  test('is higher, shorter and quieter than a switch, higher zooming in', () => {
    const [press] = getSwitchClicks(true);

    for (const zoomingIn of [true, false]) {
      const tick = getZoomTick(zoomingIn);

      assert.ok(tick.frequency > press.frequency);
      assert.ok(tick.duration < press.duration);
      assert.ok(tick.gain < press.gain);
    }

    assert.ok(getZoomTick(true).frequency > getZoomTick(false).frequency);
  });
});

describe('isTickDue', () => {
  test('ticks the first time', () => {
    assert.equal(isTickDue(0, null), true);
  });

  test('waits the interval between ticks', () => {
    assert.equal(isTickDue(1000 + ZOOM_TICK_INTERVAL - 1, 1000), false);
    assert.equal(isTickDue(1000 + ZOOM_TICK_INTERVAL, 1000), true);
  });
});
