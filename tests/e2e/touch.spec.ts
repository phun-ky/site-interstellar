import { type CDPSession, expect, type Page, test } from '@playwright/test';

import {
  lockOn,
  nextFrames,
  openApp,
  recordFrames,
  showGalaxy
} from './helpers';

type Point = { x: number; y: number };

/** Real touch input, as Chrome gets it from a touch screen. */
const touch = (
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: Point[]
) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(({ x, y }, id) => ({ x, y, id }))
  });

/** Moves fingers from `from` to `to` in small steps, then lifts them. */
const gesture = async (
  page: Page,
  from: Point[],
  to: Point[],
  steps = 10
): Promise<void> => {
  const cdp = await page.context().newCDPSession(page);

  await touch(cdp, 'touchStart', from);

  for (let step = 1; step <= steps; step++) {
    await touch(
      cdp,
      'touchMove',
      from.map((start, i) => ({
        x: start.x + ((to[i].x - start.x) * step) / steps,
        y: start.y + ((to[i].y - start.y) * step) / steps
      }))
    );
  }

  await touch(cdp, 'touchEnd', []);
  await cdp.detach();
  await nextFrames(page);
};

/** The middle of the canvas, in page pixels. */
const canvasCentre = async (page: Page): Promise<Point> => {
  const box = await page.locator('canvas').boundingBox();

  return {
    x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
    y: (box?.y ?? 0) + (box?.height ?? 0) / 2
  };
};

/** Two fingers either side of `centre`, `gap` pixels apart. */
const fingers = ({ x, y }: Point, gap: number): Point[] => [
  { x: x - gap / 2, y },
  { x: x + gap / 2, y }
];

const zoomLevel = async (page: Page): Promise<number> =>
  Number.parseFloat(await page.locator('#zoomLevel').innerText());

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test.describe('on a touch screen', () => {
  // Wide enough for the X and Y readout, which shows the pan
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: true });

  test('the map takes the touch, not the page', async ({ page }) => {
    await openApp(page);

    expect(
      await page
        .locator('canvas')
        .evaluate((el) => getComputedStyle(el).touchAction)
    ).toBe('none');
  });

  test('one finger pans the map', async ({ page }) => {
    await openApp(page);
    // The map opens locked on the Sun, which keeps it in the middle
    await showGalaxy(page);

    const before = await page.locator('.mc-cells').first().innerText();
    const centre = await canvasCentre(page);

    await gesture(page, [centre], [{ x: centre.x + 120, y: centre.y + 60 }]);

    await expect
      .poll(() => page.locator('.mc-cells').first().innerText())
      .not.toBe(before);
    // Panning is not a tap: nothing is locked
    await expect(page.locator('#lockStatus')).toBeHidden();
  });

  test('two fingers pinch to zoom in and out', async ({ page }) => {
    await openApp(page);

    const centre = await canvasCentre(page);
    const start = await zoomLevel(page);

    await gesture(page, fingers(centre, 100), fingers(centre, 300));

    const zoomedIn = await zoomLevel(page);

    expect(zoomedIn).toBeGreaterThan(start);

    await gesture(page, fingers(centre, 300), fingers(centre, 100));

    expect(await zoomLevel(page)).toBeLessThan(zoomedIn);
  });

  test('pinching while locked zooms and keeps the lock', async ({ page }) => {
    await openApp(page);
    await lockOn(page, 'jupiter');

    const centre = await canvasCentre(page);
    const start = await zoomLevel(page);

    await gesture(page, fingers(centre, 100), fingers(centre, 250));

    expect(await zoomLevel(page)).toBeGreaterThan(start);
    await expect(page.locator('#lockStatusName')).toHaveText('Jupiter');
  });

  test('a tap on a body opens the focus view on it', async ({ page }) => {
    await openApp(page);
    await lockOn(page, 'jupiter');
    await page.locator('#pause').click();

    // The locked body is drawn in the middle of the canvas
    const centre = await canvasCentre(page);

    await page.touchscreen.tap(centre.x, centre.y);

    await expect(page.locator('#focusView')).toBeVisible();
    await expect(page.locator('#focusTitle')).toHaveText('Jupiter');
    await expect(page.locator('#bodyInfo')).toBeHidden();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('pinching zooms, and the page itself does not move', async ({
    page
  }) => {
    await openApp(page);

    const centre = await canvasCentre(page);
    const start = await zoomLevel(page);

    await gesture(page, fingers(centre, 80), fingers(centre, 240));

    expect(await zoomLevel(page)).toBeGreaterThan(start);
    expect(
      await page.evaluate(() => [
        window.scrollX,
        window.scrollY,
        visualViewport?.scale
      ])
    ).toEqual([0, 0, 1]);
  });
});
