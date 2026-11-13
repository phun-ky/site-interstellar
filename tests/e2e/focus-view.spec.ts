import { expect, type Page, test } from '@playwright/test';

import {
  collectErrors,
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames
} from './helpers';

const view = (page: Page) => page.locator('#focusView');
const release = (page: Page) => page.locator('#focusClose');
/** Where a body is drawn, and how big, in canvas pixels. */
const drawn = async (page: Page, id: string) =>
  (await readApp(page, (app) => app.NEAREST_BODIES))[id] ?? null;
/** The canvas's size, in CSS pixels. */
const canvasSize = (page: Page) =>
  page.locator('#spaceCanvas').evaluate((canvas) => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight
  }));
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
/** Opens the focus view on Earth, from the Sun, and waits for the zoom. */
const focusEarth = async (page: Page): Promise<void> => {
  await lockOn(page, 'sun');
  await clickBody(page, 'earth');
  await expect(view(page)).toBeVisible();
  await page.waitForTimeout(1100);
  await nextFrames(page);
};

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test.describe('on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('clicking a body opens the focus view on it; the Lock menu still only locks', async ({
    page
  }) => {
    await lockOn(page, 'sun');
    await expect(view(page)).toBeHidden();

    await clickBody(page, 'earth');
    await expect(view(page)).toBeVisible();
    await expect(page.locator('#focusTitle')).toHaveText('Earth');
    await expect(page.locator('#focusCode')).toHaveText('Sun III');
    await expect(page.locator('#focusPath')).toHaveText(/Milky Way.*Sun/);
    await expect(page.locator('#focusMapCaption')).toHaveText('Solar system');
    await expect(page.locator('#focusRange')).toHaveText(/^\d\.\d{6} au$/);
    await expect(page.locator('#focusSpeed')).toHaveText(/km\/s$/);
    await expect(page.locator('#bodyInfo')).toBeHidden();
    await expect
      .poll(() => readApp(page, (app) => app.FOCUSED_CELESTIAL_BODY?.id))
      .toBe('earth');

    // The HUD slides away, the views console with it
    await expect(page.locator('.mc-left')).toBeHidden();
    await expect(page.locator('#systems')).toBeHidden();
    await expect(page.locator('.mc-views')).toBeHidden();
    await expect(release(page)).toBeFocused();

    // The minimap grows into the system map
    const minimap = await page.locator('#minimap').boundingBox();

    expect(minimap?.width).toBeGreaterThan(200);

    // Over the data column, which is made after it, not dimmed under it
    const zIndex = (selector: string) =>
      page
        .locator(selector)
        .evaluate((element) => Number(getComputedStyle(element).zIndex));

    expect(await zIndex('#minimap')).toBeGreaterThan(
      await zIndex('#focusView')
    );
  });

  test('the body sits in the middle at about half the height, with the visor round it', async ({
    page
  }) => {
    await focusEarth(page);

    const earth = await drawn(page, 'earth');
    const { width, height } = await canvasSize(page);

    expect(earth?.x).toBeCloseTo(width / 2, 0);
    expect(earth?.y).toBeCloseTo(height / 2, 0);
    expect((earth?.size ?? 0) * 2).toBeGreaterThan(height * 0.4);
    expect((earth?.size ?? 0) * 2).toBeLessThanOrEqual(height * (2 / 3));

    // The text drawn on the map in the next two frames; the system map draws
    // its own, on its own canvas
    const text = await page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const seen: string[] = [];
          const { fillText } = CanvasRenderingContext2D.prototype;

          CanvasRenderingContext2D.prototype.fillText = function (
            value,
            ...rest
          ) {
            if (this.canvas.id === 'spaceCanvas') seen.push(String(value));

            return fillText.call(this, value, ...rest);
          };
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              CanvasRenderingContext2D.prototype.fillText = fillText;
              resolve(seen);
            })
          );
        })
    );

    expect(text).toEqual(expect.arrayContaining(['BRG', 'RNG AU', 'VEL KM/S']));
  });

  test('time holds and zooming is off while it is open', async ({ page }) => {
    await focusEarth(page);
    await expect(page.locator('#simStatus')).toHaveText('◌ hold');
    expect(await readApp(page, (app) => app.PAUSE)).toBe(true);

    const date = await page.locator('#simDate').textContent();
    const zoom = await page.locator('#zoomLevel').textContent();
    const canvas = await page.locator('#spaceCanvas').boundingBox();

    await page.mouse.move(
      (canvas?.x ?? 0) + (canvas?.width ?? 0) / 2,
      (canvas?.y ?? 0) + (canvas?.height ?? 0) / 2
    );
    await page.mouse.wheel(0, -600);
    await page.keyboard.press('Control+Equal');
    await page.waitForTimeout(600);

    await expect(page.locator('#zoomLevel')).toHaveText(zoom ?? '');
    await expect(page.locator('#simDate')).toHaveText(date ?? '');
  });

  test('Release target brings the HUD and time back, framing the parent with the body in view', async ({
    page
  }) => {
    await focusEarth(page);
    await release(page).click();

    await expect(view(page)).toBeHidden();
    await expect(page.locator('.mc-left')).toBeVisible();
    await expect(page.locator('#systems')).toBeVisible();
    await expect(page.locator('.mc-views')).toBeVisible();
    await expect(page.locator('#simStatus')).toHaveText('● nominal');

    // The zoom out animates for 900 ms
    await page.waitForTimeout(1200);
    await nextFrames(page);

    const { width, height } = await canvasSize(page);
    const sun = await drawn(page, 'sun');
    const earth = await drawn(page, 'earth');

    expect(await readApp(page, (app) => app.LOCKED_CELESTIAL_BODY)).toBeNull();
    expect(Math.abs((sun?.x ?? 0) - width / 2)).toBeLessThan(4);
    expect(Math.abs((sun?.y ?? 0) - height / 2)).toBeLessThan(4);
    expect(earth?.x).toBeGreaterThan(0);
    expect(earth?.x).toBeLessThan(width);
    expect(earth?.y).toBeGreaterThan(0);
    expect(earth?.y).toBeLessThan(height);
  });

  test('time held before the view stays held after it', async ({ page }) => {
    await page.locator('#pause').click();
    await focusEarth(page);
    await page.keyboard.press('Escape');

    await expect(view(page)).toBeHidden();
    expect(await readApp(page, (app) => app.PAUSE)).toBe(true);
    await expect(page.locator('#simStatus')).toHaveText('◌ hold');
  });

  test('a small moon stays put in the middle', async ({ page }) => {
    const { width, height } = await canvasSize(page);

    // Phobos is 11 km across: rounding in its galactic position is hundreds
    // of pixels at this zoom, so it is pinned to the middle
    await lockOn(page, 'phobos');
    await page.mouse.click(
      width / 2,
      height / 2 + ((await page.locator('#spaceCanvas').boundingBox())?.y ?? 0)
    );
    await expect(view(page)).toBeVisible();
    await expect(page.locator('#focusCode')).toHaveText('Mars I');
    await page.waitForTimeout(1100);

    for (let i = 0; i < 5; i++) {
      await nextFrames(page);

      const phobos = await drawn(page, 'phobos');

      expect(phobos?.x).toBeCloseTo(width / 2, 0);
      expect(phobos?.y).toBeCloseTo(height / 2, 0);
    }
  });
});

test.describe('the Sun', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('with no orbit, it opens without errors, and without range or speed tapes', async ({
    page
  }) => {
    const errors = collectErrors(page);

    // The map opens locked on the Sun
    await clickBody(page, 'sun');
    await expect(view(page)).toBeVisible();
    await page.waitForTimeout(1100);
    await nextFrames(page);

    expect(errors).toEqual([]);
    expect(
      await readApp(page, (app) => app.__lastFrameText.join(' '))
    ).not.toContain('RNG AU');
  });
});

test.describe('on a short desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('a long list of facts scrolls above the system map, rather than over it', async ({
    page
  }) => {
    // The Sun has the most facts: eleven
    await clickBody(page, 'sun');
    await expect(view(page)).toBeVisible();
    await expect(page.locator('#focusFacts > div')).toHaveCount(11);

    const column = await view(page).boundingBox();
    const caption = await page.locator('#focusMapCaption').boundingBox();

    expect((column?.y ?? 0) + (column?.height ?? 0)).toBeLessThanOrEqual(
      caption?.y ?? 0
    );
    // All of them can be scrolled to
    await page.locator('#focusFacts > div').last().scrollIntoViewIfNeeded();
    await expect(page.locator('#focusFacts > div').last()).toBeInViewport();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the facts are a sheet at the bottom, with the body above it', async ({
    page
  }) => {
    await page.locator('#systemsToggle').click();
    await page.selectOption('#lockOn', 'jupiter');
    await page.locator('#systemsToggle').click();
    await page.waitForTimeout(1000);

    const canvas = await page.locator('#spaceCanvas').boundingBox();
    const { width, height } = await canvasSize(page);

    await page.touchscreen.tap(width / 2, (canvas?.y ?? 0) + height / 2);
    await expect(view(page)).toBeVisible();
    await expect(release(page)).toBeInViewport();
    await page.waitForTimeout(1100);
    await nextFrames(page);

    const sheet = await view(page).boundingBox();
    const jupiter = await drawn(page, 'jupiter');

    expect((sheet?.y ?? 0) + (sheet?.height ?? 0)).toBeCloseTo(844, 0);
    expect(
      (canvas?.y ?? 0) + (jupiter?.y ?? 0) + (jupiter?.size ?? 0)
    ).toBeLessThan(sheet?.y ?? 0);
  });
});
