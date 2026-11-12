import { expect, type Page, test } from '@playwright/test';

import {
  collectErrors,
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames,
  showGalaxy,
  toggle
} from './helpers';

/** Where each body was drawn in the last frame, by id, or `null` if it wasn't. */
const drawn = async (page: Page, ids: string[]) => {
  await nextFrames(page);

  return page.evaluate(
    (ids) =>
      ids.map(
        (id) =>
          (
            globalThis as unknown as {
              NEAREST_BODIES: Record<string, { x: number; y: number }>;
            }
          ).NEAREST_BODIES[id] ?? null
      ),
    ids
  );
};
/** The middle of the canvas, where a locked body is drawn. */
const centre = (page: Page) =>
  page.locator('canvas').evaluate((canvas) => ({
    x: canvas.clientWidth / 2,
    y: canvas.clientHeight / 2
  }));

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test("TRAPPIST-1's seven planets circle their own star (#103)", async ({
  page
}) => {
  const errors = collectErrors(page);

  await openApp(page);
  await lockOn(page, 'trappist-1a');

  const middle = await centre(page);
  const [star, ...planets] = await drawn(page, [
    'trappist-1a',
    ...'bcdefgh'.split('').map((letter) => `trappist-1${letter}`)
  ]);

  expect(star).not.toBeNull();
  expect(Math.abs((star?.x ?? 0) - middle.x)).toBeLessThan(2);

  // Every planet drawn, round the star and on screen, not round the Sun
  for (const planet of planets) {
    expect(planet).not.toBeNull();

    const distance = Math.hypot(
      (planet?.x ?? 0) - middle.x,
      (planet?.y ?? 0) - middle.y
    );

    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(middle.y);
  }

  expect(errors).toEqual([]);
});

test('Dimorphos is drawn with Didymos, which holds still at the centre', async ({
  page
}) => {
  await openApp(page);
  await toggle(page, 'toggleMoons');
  await toggle(page, 'toggleAsteroids');
  await lockOn(page, '65803-didymos');

  const middle = await centre(page);

  for (let frame = 0; frame < 3; frame++) {
    const [didymos, dimorphos] = await drawn(page, [
      '65803-didymos',
      'dimorphos'
    ]);

    expect(dimorphos).not.toBeNull();
    expect(Math.abs((didymos?.x ?? 0) - middle.x)).toBeLessThan(2);
    expect(Math.abs((didymos?.y ?? 0) - middle.y)).toBeLessThan(2);
  }

  // Too close to tell apart, so its label is counted on Didymos's
  expect(
    await readApp(page, (app) => app.LABEL_BOXES.map(({ label }) => label))
  ).toContain('DIDYMOS +1');
});

test('the S-stars are drawn round Sagittarius A* once they can be told apart', async ({
  page
}) => {
  await openApp(page);
  await showGalaxy(page);

  // At the galaxy's scale they would all sit on the black hole
  expect(await drawn(page, ['s1', 's2', 's4'])).toEqual([null, null, null]);

  await lockOn(page, 's2');

  const [s2, ...others] = await drawn(page, ['s2', 's1', 's4', 's8']);
  const middle = await centre(page);

  expect(Math.abs((s2?.x ?? 0) - middle.x)).toBeLessThan(2);

  for (const star of others) expect(star).not.toBeNull();
});

test('the new moons of Saturn, Pluto and Eris are drawn', async ({ page }) => {
  await openApp(page);
  await toggle(page, 'toggleMoons');

  for (const [planet, moons] of [
    ['saturn', ['mimas', 'tethys', 'dione']],
    ['pluto', ['charon', 'styx', 'nix', 'kerberos', 'hydra']],
    ['eris', ['dysnomia']]
  ] as const) {
    await lockOn(page, planet);
    expect(await drawn(page, [...moons])).not.toContain(null);
  }
});

test.describe('2.7 data (#105)', () => {
  const INTERSTELLAR = ['1i-oumuamua', '2i-borisov', '3i-atlas'];

  test('the Interstellar toggle draws the three interstellar objects', async ({
    page
  }) => {
    const errors = collectErrors(page);

    await openApp(page);
    await lockOn(page, 'sun');
    expect(await drawn(page, INTERSTELLAR)).toEqual([null, null, null]);

    await toggle(page, 'toggleInterstellar');
    expect(await drawn(page, INTERSTELLAR)).not.toContain(null);

    await lockOn(page, '1i-oumuamua');

    const middle = await centre(page);
    const [oumuamua] = await drawn(page, ['1i-oumuamua']);

    expect(Math.abs((oumuamua?.x ?? 0) - middle.x)).toBeLessThan(2);

    // Its info: a closest pass and a speed, not a size and a period
    await page.locator('#bodyInfoOpen').click();
    await expect(page.locator('#bodyInfo')).toContainText('Excess speed');
    await expect(page.locator('#bodyInfo')).toContainText('Perihelion');
    await expect(page.locator('#bodyInfo')).not.toContainText('Period');
    expect(errors).toEqual([]);
  });

  test('the galaxies are drawn, listed and can be locked on', async ({
    page
  }) => {
    await openApp(page);

    const options = page.locator('#lockOn optgroup[label="Galaxies"] option');

    await expect(options).toHaveCount(7);
    expect(
      await drawn(page, ['andromeda', 'large-magellanic-cloud', 'm87'])
    ).not.toContain(null);

    await lockOn(page, 'andromeda');

    const middle = await centre(page);
    const [andromeda] = await drawn(page, ['andromeda']);

    expect(Math.abs((andromeda?.x ?? 0) - middle.x)).toBeLessThan(2);
    expect(Math.abs((andromeda?.y ?? 0) - middle.y)).toBeLessThan(2);

    await page.locator('#bodyInfoOpen').click();
    await expect(page.locator('#bodyInfo')).toContainText('Distance');
    await expect(page.locator('#bodyInfoTitle')).toHaveText('Andromeda');
  });
});

test.describe('2.14 data: what is measured about a body', () => {
  /** The info's facts, as label and value pairs. */
  const facts = (page: Page) =>
    page
      .locator('#bodyInfoFacts dt')
      .evaluateAll((terms) =>
        terms.map((term) => [
          term.textContent?.trim(),
          term.nextElementSibling?.textContent?.trim()
        ])
      );

  test("the info shows a star's class, mass and measurements, a planet's rotation and rings, and an interstellar object's discovery", async ({
    page
  }) => {
    await openApp(page);

    // The map opens locked on the Sun
    await page.locator('#bodyInfoOpen').click();
    expect(await facts(page)).toEqual(
      expect.arrayContaining([
        ['Spectral class', 'G2V'],
        ['Mass', '1 M☉'],
        ['Temperature', '5,772 K'],
        ['Luminosity', '1 L☉'],
        ['Surface gravity', 'log g 4.438'],
        ['Metallicity', '[Fe/H] 0.00'],
        ['Rotation', '25.38 d']
      ])
    );

    await lockOn(page, 'saturn');
    await page.locator('#bodyInfoOpen').click();
    expect(await facts(page)).toEqual(
      expect.arrayContaining([
        ['Rotation', '10.66 h'],
        ['Rings', '9']
      ])
    );

    await toggle(page, 'toggleInterstellar');
    await lockOn(page, '1i-oumuamua');
    await page.locator('#bodyInfoOpen').click();
    expect(await facts(page)).toContainEqual([
      'Discovered',
      '2017-10-19 · R. Weryk'
    ]);
  });
});
