import { expect, type Page, test } from '@playwright/test';

import { lockOn, nextFrames, openApp, readApp, recordFrames } from './helpers';

type PointType = { x: number; y: number };

const panel = (page: Page) => page.locator('#lockCentre');
const map = (page: Page) => page.locator('#mapCentre');

/** Where a body is drawn, from the middle of the canvas, in pixels. */
const fromMiddle = async (page: Page, id: string): Promise<PointType> => {
  await nextFrames(page);

  const box = await page.locator('#spaceCanvas').boundingBox();
  const body = await readApp(page, (app) => app.NEAREST_BODIES);
  const { x, y } = body[id];

  return {
    x: x - (box?.width ?? 0) / 2,
    y: y - (box?.height ?? 0) / 2
  };
};
/** Drags the mouse across the canvas from a point clear of the locked body. */
const drag = async (page: Page, by: PointType): Promise<void> => {
  const box = await page.locator('#spaceCanvas').boundingBox();
  const start = {
    x: (box?.x ?? 0) + (box?.width ?? 0) / 2 - 80,
    y: (box?.y ?? 0) + (box?.height ?? 0) / 2 + 200
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + by.x, start.y + by.y, { steps: 10 });
  await page.mouse.up();
};
/** Whether a point is within a pixel or two of another. */
const near = (a: PointType, b: PointType, within = 2): boolean =>
  Math.abs(a.x - b.x) <= within && Math.abs(a.y - b.y) <= within;

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('dragging pans off the locked body, and the camera keeps following it (#118)', async ({
  page
}) => {
  expect(near(await fromMiddle(page, 'sun'), { x: 0, y: 0 })).toBe(true);
  await expect(panel(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(map(page)).toBeHidden();

  await drag(page, { x: 200, y: -120 });

  const panned = await fromMiddle(page, 'sun');

  expect(near(panned, { x: 200, y: -120 })).toBe(true);
  expect(await readApp(page, (app) => app.LOCKED_CELESTIAL_BODY?.id)).toBe(
    'sun'
  );

  // Time runs, the Sun moves through the galaxy, and stays at that gap
  await page.waitForTimeout(1000);
  expect(near(await fromMiddle(page, 'sun'), panned)).toBe(true);

  await expect(panel(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(map(page)).toBeVisible();
  await expect(map(page)).toHaveText(/Centre on Sun/i);
});

test('Centre on the map, Centre beside Lock and the C key bring the body back (#118)', async ({
  page
}) => {
  for (const centre of [
    () => map(page).click(),
    () => panel(page).click(),
    () => page.keyboard.press('c')
  ]) {
    await drag(page, { x: -150, y: 90 });
    await expect(map(page)).toBeVisible();

    await centre();

    await expect(map(page)).toBeHidden();
    await expect(panel(page)).toHaveAttribute('aria-disabled', 'true');
    expect(near(await fromMiddle(page, 'sun'), { x: 0, y: 0 })).toBe(true);
  }
});

test('C typed into a field is text, not Centre (#118)', async ({ page }) => {
  await drag(page, { x: 120, y: 60 });
  await page.locator('#viewBodies').click();
  await expect(page.locator('#bodiesSearch')).toBeFocused();
  await page.keyboard.press('c');

  await expect(page.locator('#bodiesSearch')).toHaveValue('c');
  expect(near(await fromMiddle(page, 'sun'), { x: 120, y: 60 })).toBe(true);
});

test('locking on another body, or a view, starts it in the middle (#118)', async ({
  page
}) => {
  await drag(page, { x: 160, y: 40 });
  await lockOn(page, 'jupiter');

  expect(near(await fromMiddle(page, 'jupiter'), { x: 0, y: 0 })).toBe(true);
  await expect(map(page)).toBeHidden();

  await drag(page, { x: 160, y: 40 });
  await page.locator('#viewSolarSystem').click();
  await expect
    .poll(() => readApp(page, (app) => app.LOCKED_CELESTIAL_BODY?.id))
    .toBe('sun');
  await page.waitForTimeout(900);
  expect(near(await fromMiddle(page, 'sun'), { x: 0, y: 0 })).toBe(true);
});

test('zooming while centred keeps the body in the middle (#118)', async ({
  page
}) => {
  const box = await page.locator('#spaceCanvas').boundingBox();
  const before = await page.locator('#zoomLevel').innerText();

  // Over the map, away from the Sun and clear of the panels
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) / 2 + 250,
    (box?.y ?? 0) + (box?.height ?? 0) / 2 + 150
  );
  await page.mouse.wheel(0, -300);
  await expect(page.locator('#zoomLevel')).not.toHaveText(before);

  expect(near(await fromMiddle(page, 'sun'), { x: 0, y: 0 })).toBe(true);
  await expect(map(page)).toBeHidden();
});
