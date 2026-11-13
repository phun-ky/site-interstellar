import { expect, type Page, test } from '@playwright/test';

import { openApp, recordFrames, toggle } from './helpers';

declare global {
  interface Window {
    /** Every click the page has played: its band, and when, in milliseconds. */
    __clicks: { frequency: number; at: number }[];
  }
}

/**
 * Records every click the page synthesises: noise played through a band-pass
 * filter, whose middle frequency tells which sound it is.
 */
const recordClicks = (page: Page) =>
  page.addInitScript(() => {
    window.__clicks = [];

    const bands = new WeakMap<AudioNode, BiquadFilterNode>();
    const connect = AudioNode.prototype.connect as (
      this: AudioNode,
      ...args: unknown[]
    ) => AudioNode;
    const { start } = AudioBufferSourceNode.prototype;

    AudioNode.prototype.connect = function (
      this: AudioNode,
      ...args: unknown[]
    ) {
      if (args[0] instanceof BiquadFilterNode) bands.set(this, args[0]);

      return connect.apply(this, args);
    } as typeof AudioNode.prototype.connect;

    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__clicks.push({
        frequency: bands.get(this)?.frequency.value ?? 0,
        at: performance.now()
      });

      return start.apply(this, args);
    };
  });

/** The bands of the clicks played since the last call. */
const takeClicks = async (page: Page): Promise<number[]> =>
  (await page.evaluate(() => window.__clicks.splice(0))).map(
    ({ frequency }) => frequency
  );

/** A switch: the press, then the release, higher for on and lower for off. */
const SWITCH_ON = [1800, 3200];
const SWITCH_OFF = [3200, 1800];
const TICK_IN = 5200;
const TICK_OUT = 4200;

/** Whether the ambience is playing: started, not paused, and moving. */
const ambiencePlays = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => {
        const audio = document.getElementById(
          'ambience'
        ) as HTMLAudioElement | null;

        return !!audio && !audio.paused && audio.currentTime > 0;
      })
    )
    .toBe(true);

/** Whether the ambience is paused. */
const ambiencePaused = (page: Page) =>
  page
    .locator('#ambience')
    .evaluate((audio) => (audio as HTMLAudioElement).paused);

/**
 * Makes the window lose or regain focus, as when someone clicks another
 * window: headless pages always report focus, so `hasFocus` is set before
 * the `blur` or `focus` event fires, and nothing else is.
 */
const setFocused = (page: Page, focused: boolean) =>
  page.evaluate((focused) => {
    document.hasFocus = () => focused;
    window.dispatchEvent(new Event(focused ? 'focus' : 'blur'));
  }, focused);

/**
 * Hides or shows the page, as when someone switches tab: `hidden` is set
 * before the `visibilitychange` event fires, and nothing else is.
 */
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

const audioRequests = (page: Page): string[] => {
  const urls: string[] = [];

  page.on('request', (request) => {
    if (request.url().includes('/audio/')) urls.push(request.url());
  });

  return urls;
};

/** Opens Settings from the header menu. */
const openSettings = async (page: Page) => {
  // Behind the menu button only where the header row doesn't fit
  if (await page.locator('#menuToggle').isVisible()) {
    await page.locator('#menuToggle').click();
  }
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
};

/** Turns sounds on or off in Settings, then closes it. */
const setSounds = async (page: Page, ...ids: string[]) => {
  await openSettings(page);

  for (const id of ids) await toggle(page, id);

  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeHidden();
};

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await recordClicks(page);
});

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every sound is off, and no audio is loaded, until one is turned on', async ({
    page
  }) => {
    const requested = audioRequests(page);

    await openApp(page);
    await openSettings(page);

    for (const id of ['soundAmbience', 'soundClicks', 'soundTicks']) {
      await expect(page.locator(`#${id}`)).not.toBeChecked();
    }

    await page.keyboard.press('Escape');

    // Flicking a toggle while sound is off makes no sound
    await toggle(page, 'toggleMoons');
    expect(await takeClicks(page)).toEqual([]);
    await expect(page.locator('#ambience')).toHaveCount(0);
    expect(requested).toEqual([]);
  });

  test('Background ambience plays on a loop, quietly, and nothing else', async ({
    page
  }) => {
    const requested = audioRequests(page);

    await openApp(page);
    await openSettings(page);
    await toggle(page, 'soundAmbience');
    await ambiencePlays(page);
    // On a loop, in the background
    expect(
      await page.locator('#ambience').evaluate((audio) => {
        const { loop, volume } = audio as HTMLAudioElement;

        return { loop, volume };
      })
    ).toEqual({ loop: true, volume: 0.05 });
    // Opus, which Chrome plays, and nothing else
    expect(requested.every((url) => url.endsWith('/audio/ambience.webm'))).toBe(
      true
    );
    expect(requested.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__violations)).toEqual([]);

    // Off again: silence. Switch clicks are off, so nothing clicked
    await toggle(page, 'soundAmbience');
    expect(await ambiencePaused(page)).toBe(true);
    expect(await takeClicks(page)).toEqual([]);
  });

  test('Switch clicks click every switch, their own as it goes off too', async ({
    page
  }) => {
    await openApp(page);
    await openSettings(page);

    // Its own switch, then the other switches in Settings
    await toggle(page, 'soundClicks');
    expect(await takeClicks(page)).toEqual(SWITCH_ON);
    await toggle(page, 'soundTicks');
    expect(await takeClicks(page)).toEqual(SWITCH_ON);
    await toggle(page, 'soundTicks');
    expect(await takeClicks(page)).toEqual(SWITCH_OFF);
    await page.keyboard.press('Escape');

    // The Systems toggles
    await toggle(page, 'toggleMoons');
    expect(await takeClicks(page)).toEqual(SWITCH_ON);
    await toggle(page, 'toggleMoons');
    expect(await takeClicks(page)).toEqual(SWITCH_OFF);
    // Without the ambience, which is not even loaded
    await expect(page.locator('#ambience')).toHaveCount(0);

    // Turned off, it clicks a last time, then the toggles are silent
    await setSounds(page, 'soundClicks');
    expect(await takeClicks(page)).toEqual(SWITCH_OFF);
    await toggle(page, 'toggleMoons');
    expect(await takeClicks(page)).toEqual([]);
  });
});

test.describe('away from the page', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('is silent while the window is out of focus, and plays again after', async ({
    page
  }) => {
    await openApp(page);
    await setSounds(page, 'soundAmbience', 'soundClicks');
    await ambiencePlays(page);
    await takeClicks(page);

    await setFocused(page, false);
    expect(await ambiencePaused(page)).toBe(true);
    // Sound stays on, but nothing clicks
    await expect(page.locator('#soundAmbience')).toBeChecked();
    await page.locator('#toggleMoons').evaluate((input) => {
      (input as HTMLInputElement).click();
    });
    expect(await takeClicks(page)).toEqual([]);

    await setFocused(page, true);
    await ambiencePlays(page);
    await toggle(page, 'toggleMoons');
    expect(await takeClicks(page)).toEqual(SWITCH_OFF);
  });

  test('is silent while the tab is hidden, and plays again when shown', async ({
    page
  }) => {
    await openApp(page);
    await setSounds(page, 'soundAmbience');
    await ambiencePlays(page);

    await setHidden(page, true);
    expect(await ambiencePaused(page)).toBe(true);

    await setHidden(page, false);
    await ambiencePlays(page);
  });
});

test.describe('zooming with the wheel', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /**
   * Spins the wheel fast for a second, over the middle of the map: a wheel
   * event every 16 ms, as a fast flick or a trackpad sends them.
   */
  /** Spins the wheel: 60 events, 16 ms apart. Resolves with how long they took, in milliseconds. */
  const spinWheel = (page: Page, deltaY: number) =>
    page.evaluate(
      (deltaY) =>
        new Promise<number>((resolve) => {
          const startedAt = performance.now();
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          const { left, top, width, height } = canvas.getBoundingClientRect();
          let sent = 0;
          const timer = setInterval(() => {
            canvas.dispatchEvent(
              new WheelEvent('wheel', {
                deltaY,
                clientX: left + width / 2,
                clientY: top + height / 2,
                bubbles: true,
                cancelable: true
              })
            );

            if (++sent === 60) {
              clearInterval(timer);
              resolve(performance.now() - startedAt);
            }
          }, 16);
        }),
      deltaY
    );

  test('ticks evenly while zoom ticks are on, higher in than out', async ({
    page
  }) => {
    await openApp(page);
    await setSounds(page, 'soundTicks');
    // Switch clicks are off: turning ticks on made no sound
    expect(await takeClicks(page)).toEqual([]);

    const spun = await spinWheel(page, -100);
    const ticks = await page.evaluate(() => window.__clicks.splice(0));

    // 60 wheel events in about a second, but a tick every 80 ms at most:
    // tick tick tick. On a busy machine the events take longer, so the most
    // ticks there can be is counted from how long they took
    expect(ticks.length).toBeGreaterThanOrEqual(8);
    expect(ticks.length).toBeLessThanOrEqual(Math.floor(spun / 80) + 1);
    expect(ticks.every(({ frequency }) => frequency === TICK_IN)).toBe(true);

    // 80 ms apart when the tick is due; timed here as the sound starts, a
    // moment later, so a busy machine can bring two a few milliseconds closer
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].at - ticks[i - 1].at).toBeGreaterThanOrEqual(70);
    }

    await page.waitForTimeout(100);
    await spinWheel(page, 100);

    const out = await takeClicks(page);

    expect(out.length).toBeGreaterThanOrEqual(8);
    expect(out.every((frequency) => frequency === TICK_OUT)).toBe(true);
  });

  test('is silent while zoom ticks are off, even with switch clicks on', async ({
    page
  }) => {
    await openApp(page);
    await spinWheel(page, -100);
    expect(await takeClicks(page)).toEqual([]);

    await setSounds(page, 'soundClicks');
    await takeClicks(page);
    await spinWheel(page, -100);

    expect(await takeClicks(page)).toEqual([]);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('Settings opens from the menu and plays the ambience', async ({
    page
  }) => {
    await openApp(page);
    await page.locator('#menuToggle').tap();
    await page.getByRole('button', { name: 'Settings' }).tap();
    await page.locator('label[for="soundAmbience"]').tap();
    await expect(page.locator('#soundAmbience')).toBeChecked();
    await ambiencePlays(page);
  });
});
