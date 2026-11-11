import { expect, type Page, test } from '@playwright/test';

import { lockOn, nextFrames, openApp, recordFrames } from './helpers';

/** The radius each body was drawn with in the last frame, in pixels. */
const sizes = async (page: Page, ids: string[]): Promise<number[]> => {
  await nextFrames(page);

  return page.evaluate(
    (ids) =>
      ids.map(
        (id) =>
          (
            globalThis as unknown as {
              NEAREST_BODIES: Record<string, { size: number }>;
            }
          ).NEAREST_BODIES[id]?.size ?? NaN
      ),
    ids
  );
};

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test("at the Solar System's scale, larger planets are drawn larger (#109)", async ({
  page
}) => {
  await openApp(page);
  await lockOn(page, 'sun');

  // In until even Mercury's orbit has room round it, so no planet is drawn
  // smaller for being crowded against the Sun, and only its radius counts
  await page.mouse.move(720, 450);

  for (let notch = 0; notch < 80; notch++) {
    const [mercuryAt] = await page.evaluate(() => {
      const { NEAREST_BODIES } = globalThis as unknown as {
        NEAREST_BODIES: Record<string, { x: number; y: number }>;
      };
      const [mercury, sun] = [NEAREST_BODIES.mercury, NEAREST_BODIES.sun];

      return [Math.hypot(mercury.x - sun.x, mercury.y - sun.y)];
    });

    if (mercuryAt > 60) break;

    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(30);
  }

  const [jupiter, earth, mercury] = await sizes(page, [
    'jupiter',
    'earth',
    'mercury'
  ]);

  // By whole steps of their sizes, not by the hair their true sizes add
  expect(jupiter - earth).toBeGreaterThan(1);
  expect(earth - mercury).toBeGreaterThan(0.5);
  expect(mercury).toBeGreaterThanOrEqual(1);
});

test("at the galaxy's scale, a star crowded in its system is drawn smaller (#109)", async ({
  page
}) => {
  await openApp(page);

  // Alpha Centauri A is a little larger than the Sun, but sits on its partner
  const [alphaCentauriA, sun] = await sizes(page, ['alpha-centauri-a', 'sun']);

  expect(alphaCentauriA).toBeLessThan(sun * 0.6);
});
