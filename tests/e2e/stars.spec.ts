import { expect, type Page, test } from '@playwright/test';

import { lockOn, nextFrames, openApp, readApp, recordFrames } from './helpers';

type StarType = { id: string; x: number; y: number; size: number };

/** The stars drawn in the last frame, where they are drawn. */
const readStars = async (page: Page): Promise<StarType[]> => {
  await nextFrames(page);

  return page.evaluate(() =>
    Object.values(
      (
        globalThis as unknown as {
          NEAREST_BODIES: Record<string, StarType & { category: string }>;
        }
      ).NEAREST_BODIES
    )
      .filter(({ category }) => category === 'star')
      .map(({ id, x, y, size }) => ({ id, x, y, size }))
  );
};
/** The labels drawn in the last frame. */
const readLabels = async (page: Page): Promise<string[]> => {
  await nextFrames(page);

  return readApp(page, (app) => app.LABEL_BOXES.map(({ label }) => label));
};
/** Whether two stars are drawn as one marker. */
const together = (a: StarType, b: StarType): boolean =>
  a.x === b.x && a.y === b.y;

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test("at the galaxy's scale, no two star markers overlap, and the Sun's label counts the stars drawn with it (#13)", async ({
  page
}) => {
  await openApp(page);

  const stars = await readStars(page);
  // One star of each marker
  const markers = stars.filter(
    (star, i) => stars.findIndex((other) => together(star, other)) === i
  );

  // Stars round the Sun are drawn as one at this scale
  expect(markers.length).toBeLessThan(stars.length);

  for (const [i, a] of markers.entries()) {
    for (const b of markers.slice(i + 1)) {
      expect(
        Math.hypot(a.x - b.x, a.y - b.y),
        `${a.id} and ${b.id} overlap`
      ).toBeGreaterThanOrEqual(a.size + b.size);
    }
  }

  const sun = stars.find(({ id }) => id === 'sun') as StarType;
  const withSun = stars.filter((star) => together(star, sun)).length - 1;
  const label = (await readLabels(page)).find((text) => text.startsWith('SUN'));
  const count = Number(label?.match(/ \+(\d+)$/)?.[1] ?? 0);

  expect(withSun).toBeGreaterThan(0);
  expect(count).toBeGreaterThanOrEqual(withSun);
});

test('a star system whose stars overlap is drawn as one, named after the system (#13)', async ({
  page
}) => {
  await openApp(page);
  await lockOn(page, 'sun');
  await page.mouse.move(720, 450);

  // Out until Alpha Centauri is in view, left of the Systems panel, where A
  // and B have long since come to overlap
  for (let notch = 0; notch < 120; notch++) {
    const stars = await readStars(page);
    const [a, b] = ['alpha-centauri-a', 'alpha-centauri-b'].map(
      (id) => stars.find((star) => star.id === id) as StarType
    );

    if (a && b && together(a, b) && a.x > 0 && a.x < 1000) break;

    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(30);
  }

  const stars = await readStars(page);
  const [a, b] = ['alpha-centauri-a', 'alpha-centauri-b'].map(
    (id) => stars.find((star) => star.id === id) as StarType
  );

  expect(together(a, b)).toBe(true);
  expect(await readLabels(page)).toContainEqual(
    expect.stringMatching(/^ALPHA CENTAURI( AB)?( \+\d+)?$/)
  );
  expect(await readLabels(page)).not.toContainEqual(
    expect.stringMatching(/^ALPHA CENTAURI A( \+\d+)?$/)
  );
});

for (const [locked, partner] of [
  ['spica-a', 'spica-b'],
  ['alpha-centauri-a', 'alpha-centauri-b'],
  ['sirius-a', 'sirius-b']
]) {
  test(`locking on ${locked} frames ${partner} apart from it, on screen (#13)`, async ({
    page
  }) => {
    await openApp(page);
    await lockOn(page, locked);

    const stars = await readStars(page);
    const [a, b] = [locked, partner].map(
      (id) => stars.find((star) => star.id === id) as StarType
    );
    const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };

    expect(b, `${partner} is drawn`).toBeDefined();
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.size + b.size);
    expect(b.x).toBeGreaterThan(0);
    expect(b.x).toBeLessThan(width);
    expect(b.y).toBeGreaterThan(0);
    expect(b.y).toBeLessThan(height - 64);
  });
}
