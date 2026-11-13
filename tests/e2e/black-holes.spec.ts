import { expect, type Page, test } from '@playwright/test';

import {
  collectErrors,
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames,
  showGalaxy
} from './helpers';

const view = (page: Page) => page.locator('#focusView');
/** Where a body is drawn, and how big, in canvas pixels, or `null`. */
const drawn = async (page: Page, id: string) =>
  (await readApp(page, (app) => app.NEAREST_BODIES))[id] ?? null;
/** Clicks where a body is drawn on the canvas. */
const clickBody = async (page: Page, id: string): Promise<void> => {
  const body = await drawn(page, id);
  const canvas = await page.locator('#spaceCanvas').boundingBox();

  expect(body, `${id} is drawn`).not.toBeNull();
  await page.mouse.click(
    (canvas?.x ?? 0) + (body?.x ?? 0),
    (canvas?.y ?? 0) + (body?.y ?? 0)
  );
};
/** Opens the focus view on a body by clicking it, and waits for the zoom. */
const focus = async (page: Page, id: string): Promise<void> => {
  await clickBody(page, id);
  await expect(view(page)).toBeVisible();
  await expect
    .poll(() => readApp(page, (app) => app.FOCUSED_CELESTIAL_BODY?.id))
    .toBe(id);
  await page.waitForTimeout(1100);
  await nextFrames(page);
};
/** The middle of the canvas, where a locked body is drawn. */
const middle = (page: Page) =>
  page.locator('#spaceCanvas').evaluate((canvas) => ({
    x: canvas.clientWidth / 2,
    y: canvas.clientHeight / 2
  }));

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('the Lock menu lists the four black holes', async ({ page }) => {
  await expect(
    page.locator('#lockOn optgroup[label="Black holes"] option')
  ).toHaveText(['Sagittarius A*', 'M31*', 'M87*', 'Centaurus A*']);
});

test('clicking Sagittarius A* in the Galaxy view opens the focus view on it', async ({
  page
}) => {
  const errors = collectErrors(page);

  await showGalaxy(page);
  await focus(page, 'sagittarius-a-star');

  await expect(page.locator('#focusTitle')).toHaveText('Sagittarius A*');
  await expect(page.locator('#focusKind')).toHaveText('Black hole');
  expect(await page.locator('#focusFacts').textContent()).toContain(
    '4.3 million M☉'
  );
  // Named in the panel, so not over it on the canvas too
  expect(
    await readApp(page, (app) => app.__lastFrameText.join(' '))
  ).not.toContain('MILKY WAY');
  expect(errors).toEqual([]);
});

test('locking on Sagittarius A* frames the S-stars round it', async ({
  page
}) => {
  await lockOn(page, 'sagittarius-a-star');

  const centre = await middle(page);
  const blackHole = await drawn(page, 'sagittarius-a-star');
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const sStars = (
    await Promise.all(
      ['s1', 's2', 's4', 's6', 's8', 's9', 's12'].map((id) => drawn(page, id))
    )
  ).filter(
    (star) =>
      star && star.x > 0 && star.x < width && star.y > 0 && star.y < height
  );

  expect(Math.abs((blackHole?.x ?? 0) - centre.x)).toBeLessThan(2);
  expect(Math.abs((blackHole?.y ?? 0) - centre.y)).toBeLessThan(2);
  expect(sStars.length).toBeGreaterThanOrEqual(5);
});

test.describe('another galaxy', () => {
  test("its core is the galaxy from afar: M87's opens Messier 87", async ({
    page
  }) => {
    await lockOn(page, 'm87');

    expect(await drawn(page, 'm87-star')).toBeNull();
    await focus(page, 'm87');
    await expect(page.locator('#focusTitle')).toHaveText('Messier 87');
  });

  test('from inside it, its core is its black hole', async ({ page }) => {
    const errors = collectErrors(page);
    const canvas = await page.locator('#spaceCanvas').boundingBox();

    await lockOn(page, 'm87');
    await page.mouse.move(
      (canvas?.x ?? 0) + (canvas?.width ?? 0) / 2,
      (canvas?.y ?? 0) + (canvas?.height ?? 0) / 2
    );

    // Zoom in until the galaxy's disc covers the canvas
    for (let step = 0; step < 30; step++) {
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(40);
    }

    await page.waitForTimeout(600);
    await nextFrames(page);

    expect(await drawn(page, 'm87-star')).not.toBeNull();
    await focus(page, 'm87-star');
    await expect(page.locator('#focusTitle')).toHaveText('M87*');
    await expect(page.locator('#focusPath')).toHaveText('Messier 87');
    expect(errors).toEqual([]);
  });

  test('locking on its black hole shows it in the middle, to click', async ({
    page
  }) => {
    const errors = collectErrors(page);

    await lockOn(page, 'm87-star');

    const centre = await middle(page);
    const blackHole = await drawn(page, 'm87-star');

    expect(Math.abs((blackHole?.x ?? 0) - centre.x)).toBeLessThan(2);
    expect(Math.abs((blackHole?.y ?? 0) - centre.y)).toBeLessThan(2);
    await focus(page, 'm87-star');
    expect(await page.locator('#focusFacts').textContent()).toContain(
      '6.5 billion M☉'
    );
    expect(errors).toEqual([]);
  });
});
