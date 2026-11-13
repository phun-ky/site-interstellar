import { expect, type Page, test } from '@playwright/test';

import {
  collectErrors,
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames,
  toggle
} from './helpers';

const figure = (page: Page) => page.locator('#focusImage');
const img = (page: Page) => page.locator('#focusImageImg');
/** Opens the focus view on a body by clicking it, and waits for the zoom. */
const focus = async (page: Page, id: string): Promise<void> => {
  await nextFrames(page);

  const body = (await readApp(page, (app) => app.NEAREST_BODIES))[id];
  const canvas = await page.locator('#spaceCanvas').boundingBox();

  expect(body, `${id} is drawn`).toBeTruthy();
  await page.mouse.click(
    (canvas?.x ?? 0) + (body?.x ?? 0),
    (canvas?.y ?? 0) + (body?.y ?? 0)
  );
  await expect(page.locator('#focusView')).toBeVisible();
  await page.waitForTimeout(1100);
  await nextFrames(page);
};
/** Whether the image has loaded, and is not a broken image. */
const loaded = (page: Page) =>
  img(page).evaluate(
    (element: HTMLImageElement) => element.complete && element.naturalWidth > 0
  );

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test.describe('on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the focus view shows the body's image top right, with its credit and source", async ({
    page
  }) => {
    const errors = collectErrors(page);

    // The map opens on the Sun, round which Saturn is drawn
    await focus(page, 'saturn');

    await expect(figure(page)).toBeVisible();
    await expect(page.locator('#focusImageTitle')).toHaveText(
      'Saturn at equinox'
    );
    await expect(img(page)).toHaveAttribute('alt', /rings/);
    await expect.poll(() => loaded(page)).toBe(true);
    await expect(page.locator('#focusImageCredit')).toContainText(
      'Public domain'
    );
    await expect(
      page.locator('#focusImageCredit a', { hasText: 'Source' })
    ).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Saturn_during_Equinox.jpg'
    );

    const box = await figure(page).boundingBox();

    // Top right: 32 px in from the right, below the header
    expect(
      Math.abs((box?.x ?? 0) + (box?.width ?? 0) - (1440 - 32))
    ).toBeLessThan(2);
    expect(box?.y ?? 0).toBeLessThan(200);
    expect(errors).toEqual([]);
  });

  test("an artist's impression says so, and links its licence", async ({
    page
  }) => {
    await toggle(page, 'toggleInterstellar');
    await lockOn(page, '1i-oumuamua');
    await focus(page, '1i-oumuamua');

    await expect(page.locator('#focusImageTitle')).toHaveText(
      "Artist's impression · ʻOumuamua"
    );
    await expect(
      page.locator('#focusImageCredit a', { hasText: 'CC BY-SA 4.0' })
    ).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0/'
    );
  });

  test('a body without an image has no frame, and closing hides it', async ({
    page
  }) => {
    await lockOn(page, 'sagittarius-a-star');
    await focus(page, 's2');
    await expect(figure(page)).toBeHidden();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    await lockOn(page, 'sun');
    await focus(page, 'jupiter');
    await expect(figure(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(figure(page)).toBeHidden();
  });
});

test.describe('on a small desktop', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('the frame narrows to stay clear of the range tape', async ({
    page
  }) => {
    await focus(page, 'saturn');

    const body = (await readApp(page, (app) => app.NEAREST_BODIES)).saturn;
    const canvas = await page.locator('#spaceCanvas').boundingBox();
    const box = await figure(page).boundingBox();
    // The range tape and its readout end 1.35 radii and 75 px from the middle
    const tapeEnd = (canvas?.x ?? 0) + body.x + body.size * 1.35 + 75;

    expect(box?.x ?? 0).toBeGreaterThan(tapeEnd);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(140);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the image is in the info sheet, under the body's name", async ({
    page
  }) => {
    await focus(page, 'saturn');

    expect(
      await page.evaluate(
        () =>
          document.getElementById('focusTitle')?.nextElementSibling?.id ?? null
      )
    ).toBe('focusImage');
    await figure(page).scrollIntoViewIfNeeded();
    await expect(figure(page)).toBeVisible();
    await expect.poll(() => loaded(page)).toBe(true);

    const box = await figure(page).boundingBox();

    // As wide as the sheet's text, not the desktop frame
    expect(box?.width ?? 0).toBeGreaterThan(300);
  });
});
