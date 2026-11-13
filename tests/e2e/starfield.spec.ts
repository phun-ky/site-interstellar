import { expect, type Page, test } from '@playwright/test';

import {
  nextFrames,
  openApp,
  recordFrames,
  showGalaxy,
  toggle
} from './helpers';

type StarfieldGlobalsType = {
  STARFIELD_LAYERS?: { width: number; height: number }[];
  STARFIELD_MOTION: { x: number; y: number; logZoom: number };
};

/** The starfield's layers' sizes, and how far it has moved. */
const starfield = (page: Page) =>
  page.evaluate(() => {
    const app = globalThis as unknown as StarfieldGlobalsType;

    return {
      layers: (app.STARFIELD_LAYERS ?? []).map(({ width, height }) => ({
        width,
        height
      })),
      motion: { ...app.STARFIELD_MOTION }
    };
  });
/** Drags the map from the middle of the canvas, 300 px right and 150 px up. */
const drag = async (page: Page) => {
  const box = await page.locator('#spaceCanvas').boundingBox();
  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 300, y - 150, { steps: 10 });
  await page.mouse.up();
  await nextFrames(page);
};

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('Starfield draws three layers, as sharp as the screen', async ({
  page
}) => {
  await toggle(page, 'toggleStarfield');

  const size = await page.locator('#spaceCanvas').evaluate((canvas) => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }));
  const { layers } = await starfield(page);

  // Far, middle and near, each a tile of the screen's pixels
  expect(layers).toEqual(
    Array(3).fill({ width: size.width * 2, height: size.height * 2 })
  );
});

test('the starfield drifts a little as the map is dragged and zoomed', async ({
  page
}) => {
  await toggle(page, 'toggleStarfield');
  await showGalaxy(page);
  await drag(page);

  const { motion } = await starfield(page);

  expect(motion.x).toBeCloseTo(300, 0);
  expect(motion.y).toBeCloseTo(-150, 0);

  await page.mouse.wheel(0, -300);
  await nextFrames(page);
  expect((await starfield(page)).motion.logZoom).toBeGreaterThan(0);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the starfield stays still', async ({ page }) => {
    await toggle(page, 'toggleStarfield');
    await showGalaxy(page);
    await drag(page);
    await page.mouse.wheel(0, -300);
    await nextFrames(page);

    expect((await starfield(page)).motion).toEqual({ x: 0, y: 0, logZoom: 0 });
  });
});
