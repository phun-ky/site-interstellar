import { expect, type Page, test } from '@playwright/test';

import { lockOn, openApp, recordFrames, toggle } from './helpers';

const minimap = (page: Page) => page.locator('#minimap');
/** Which map the minimap shows: `system`, `galaxy` or `neighbours`. */
const shows = (page: Page) => minimap(page).getAttribute('data-view');
/** How many of the minimap's pixels are drawn, and how many in amber (a marker). */
const drawn = (page: Page) =>
  page.locator('#minimap canvas').evaluate((canvas: HTMLCanvasElement) => {
    const { data } = (
      canvas.getContext('2d') as CanvasRenderingContext2D
    ).getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    let amber = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) lit++;

      // The marker's amber, #ffb547
      if (data[i] > 200 && data[i + 1] > 140 && data[i + 2] < 120) amber++;
    }

    return { lit, amber };
  });
/** Waits for the minimap to show a map, and for it to be drawn with a marker. */
const expectMap = async (page: Page, view: string): Promise<void> => {
  await expect.poll(() => shows(page)).toBe(view);
  await expect.poll(async () => (await drawn(page)).amber).toBeGreaterThan(0);
};

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('the minimap opens on the Milky Way, with the Sun marked (#117)', async ({
  page
}) => {
  await expect(minimap(page)).toBeVisible();
  await expectMap(page, 'galaxy');

  const canvas = await page.locator('#minimap canvas').boundingBox();
  const circle = await minimap(page).boundingBox();

  // Drawn inside its circle, not over the page
  expect(canvas?.width).toBeLessThanOrEqual(circle?.width ?? 0);
  expect(canvas?.x).toBeGreaterThanOrEqual(circle?.x ?? 0);
});

test('the Galaxy view shows the Milky Way among its neighbours (#117)', async ({
  page
}) => {
  await page.locator('#viewGalaxy').click();
  await expectMap(page, 'neighbours');
});

test('locked on a planet or a moon, it shows the system around it, one level up (#117)', async ({
  page
}) => {
  await lockOn(page, 'jupiter');
  await expect(minimap(page)).toBeVisible();
  await expectMap(page, 'system');

  await toggle(page, 'toggleMoons');
  await lockOn(page, 'io');
  await expectMap(page, 'system');
});

test('the focus view borrows the minimap, and gives it back (#117)', async ({
  page
}) => {
  const canvas = await page.locator('#spaceCanvas').boundingBox();

  await lockOn(page, 'jupiter');
  await page.mouse.click(
    (canvas?.x ?? 0) + (canvas?.width ?? 0) / 2,
    (canvas?.y ?? 0) + (canvas?.height ?? 0) / 2
  );
  await expect(page.locator('#focusView')).toBeVisible();
  await expect(page.locator('#minimap canvas.mc-system-map')).toBeAttached();

  await page.keyboard.press('Escape');
  await expect(page.locator('#focusView')).toBeHidden();
  await expect(
    page.locator('#minimap canvas.mc-minimap-canvas')
  ).toBeAttached();
  await expect.poll(async () => (await drawn(page)).lit).toBeGreaterThan(0);
});
