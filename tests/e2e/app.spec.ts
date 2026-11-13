import { expect, test } from '@playwright/test';

import {
  canvasChecksum,
  collectErrors,
  countArrowTargets,
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames,
  toggle
} from './helpers';

/** Text drawn on the canvas whatever the toggles say. */
const ALWAYS_DRAWN = ['MILKY WAY', 'SAGITTARIUS A*'];

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test('loads without errors or policy violations', async ({ page }) => {
  const errors = collectErrors(page);
  const failed: string[] = [];

  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });

  await openApp(page);
  await nextFrames(page);

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(await readApp(page, (app) => app.__violations)).toEqual([]);
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]')
  ).toHaveCount(1);
});

test('Hold and Resume update the status and the button', async ({ page }) => {
  await openApp(page);

  const status = page.locator('#simStatus');
  const button = page.locator('#pause');

  await expect(status).toHaveText('● nominal');
  await expect(button).toHaveText('Hold');

  await button.click();
  await expect(status).toHaveText('◌ hold');
  await expect(button).toHaveText('Resume');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(await readApp(page, (app) => app.PAUSE)).toBe(true);

  await button.click();
  await expect(status).toHaveText('● nominal');
  await expect(button).toHaveText('Hold');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(await readApp(page, (app) => app.PAUSE)).toBe(false);
});

test.describe('Systems toggles', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await lockOn(page, 'jupiter');
    await page.locator('#pause').click();
    await nextFrames(page);
  });

  test('Labels shows and hides body labels', async ({ page }) => {
    const labelled = await readApp(page, (app) => app.__lastFrameText);

    expect(labelled).toContain('JUPITER');

    await toggle(page, 'toggleArrowheads');
    await toggle(page, 'toggleLabels');
    expect(await readApp(page, (app) => app.__lastFrameText)).toEqual(
      ALWAYS_DRAWN
    );

    await toggle(page, 'toggleLabels');
    expect(await readApp(page, (app) => app.__lastFrameText)).toContain(
      'JUPITER'
    );
  });

  test('Trajectories draws and removes the orbits', async ({ page }) => {
    const withOrbits = await canvasChecksum(page);

    await toggle(page, 'toggleTrajectory');
    expect(await canvasChecksum(page)).not.toBe(withOrbits);

    await toggle(page, 'toggleTrajectory');
    expect(await canvasChecksum(page)).toBe(withOrbits);
  });

  test('Arrows shows and hides the arrows', async ({ page }) => {
    await toggle(page, 'toggleLabels');
    expect(
      (await readApp(page, (app) => app.__lastFrameText)).length
    ).toBeGreaterThan(ALWAYS_DRAWN.length);

    await toggle(page, 'toggleArrowheads');
    expect(await readApp(page, (app) => app.__lastFrameText)).toEqual(
      ALWAYS_DRAWN
    );
  });
});

test('Moons and Comets add and remove their bodies', async ({ page }) => {
  const drawn = () => readApp(page, (app) => Object.keys(app.NEAREST_BODIES));

  await openApp(page);
  // Locking on a planet zooms in far enough for its moons only when the
  // Moons layer is on
  await toggle(page, 'toggleMoons');
  await lockOn(page, 'jupiter');

  await expect.poll(drawn).toContain('io');
  await toggle(page, 'toggleMoons');
  await expect.poll(drawn).not.toContain('io');

  expect(await drawn()).not.toContain('1p-halley');
  await toggle(page, 'toggleComets');
  await expect.poll(drawn).toContain('1p-halley');
  await toggle(page, 'toggleComets');
  await expect.poll(drawn).not.toContain('1p-halley');
});

test('turning Moons on while locked on a planet shows its moons', async ({
  page
}) => {
  const drawn = () => readApp(page, (app) => Object.keys(app.NEAREST_BODIES));

  await openApp(page);
  await expect(page.locator('#toggleMoons')).not.toBeChecked();
  await lockOn(page, 'jupiter');
  expect(await drawn()).not.toContain('io');

  await toggle(page, 'toggleMoons');
  await expect.poll(drawn).toContain('io');
});

test('Asteroids adds and removes the asteroids without the belts', async ({
  page
}) => {
  const drawn = () => readApp(page, (app) => Object.keys(app.NEAREST_BODIES));

  await openApp(page);
  // Zoomed in far enough for the solar system's small bodies
  await lockOn(page, 'mars');
  await expect(page.locator('#toggleAsteroidBelts')).not.toBeChecked();
  expect(await drawn()).not.toContain('4-vesta');

  await toggle(page, 'toggleAsteroids');
  await expect.poll(drawn).toContain('4-vesta');
  await toggle(page, 'toggleAsteroids');
  await expect.poll(drawn).not.toContain('4-vesta');
});

test('locking on an asteroid leaves the belts off', async ({ page }) => {
  await openApp(page);
  await lockOn(page, '4-vesta');

  await expect(page.locator('#toggleAsteroids')).toBeChecked();
  await expect(page.locator('#toggleAsteroidBelts')).not.toBeChecked();
  await expect
    .poll(() => readApp(page, (app) => Object.keys(app.NEAREST_BODIES)))
    .toContain('4-vesta');
});

test('Starfield hides the background grid', async ({ page }) => {
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundImage);

  await openApp(page);
  expect(await background()).toContain('linear-gradient');

  await toggle(page, 'toggleStarfield');
  expect(await background()).toBe('none');
  await toggle(page, 'toggleStarfield');
  expect(await background()).toContain('linear-gradient');
});

test('the arrows setting limits arrows to the nearest N objects', async ({
  page
}) => {
  await openApp(page);
  await lockOn(page, 'earth');
  await page.locator('#pause').click();
  await toggle(page, 'toggleLabels');

  const arrowLabels = async () =>
    (await readApp(page, (app) => app.__lastFrameText)).filter(
      (text) => !ALWAYS_DRAWN.includes(text)
    );
  const offScreen = await readApp(
    page,
    (app) =>
      Object.values(app.NEAREST_BODIES).filter(
        ({ x, y }) => x < 0 || y < 0 || x > innerWidth || y > innerHeight
      ).length
  );

  for (const count of [5, 10, 20]) {
    await page.selectOption('#arrowCount', String(count));
    await nextFrames(page);

    const targets = countArrowTargets(await arrowLabels());

    expect(targets, `Nearest ${count}`).toBeLessThanOrEqual(count);
    expect(targets, `Nearest ${count}`).toBeGreaterThan(0);
    if (count === 5) expect(targets).toBe(5);
  }

  expect(offScreen).toBeGreaterThan(5);
});

test('locking on a body names it and centres it', async ({ page }) => {
  await openApp(page);
  await lockOn(page, 'mars');

  await expect(page.locator('#lockStatus')).toBeVisible();
  await expect(page.locator('#lockStatusName')).toHaveText(/mars/i);

  const { x, y, width, height } = await readApp(page, (app) => {
    const canvas = document.querySelector('#spaceCanvas') as HTMLCanvasElement;

    return {
      ...app.NEAREST_BODIES.mars,
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
  });

  expect(Math.abs(x - width / 2)).toBeLessThan(1);
  expect(Math.abs(y - height / 2)).toBeLessThan(1);

  await page.selectOption('#lockOn', 'noLock');
  await expect(page.locator('#lockStatus')).toBeHidden();
});

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`at device pixel ratio ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });

    test('the canvas is sharp and the locked body centred', async ({
      page
    }) => {
      await openApp(page);
      await lockOn(page, 'sun');

      const canvas = await readApp(page, (app) => {
        const element = document.querySelector(
          '#spaceCanvas'
        ) as HTMLCanvasElement;

        return {
          ratio: devicePixelRatio,
          pixels: [element.width, element.height],
          css: [element.clientWidth, element.clientHeight],
          sun: app.NEAREST_BODIES.sun
        };
      });

      expect(canvas.ratio).toBe(deviceScaleFactor);
      expect(canvas.pixels).toEqual(
        canvas.css.map((size) => Math.round(size * deviceScaleFactor))
      );
      expect(Math.abs(canvas.sun.x - canvas.css[0] / 2)).toBeLessThan(1);
      expect(Math.abs(canvas.sun.y - canvas.css[1] / 2)).toBeLessThan(1);
    });
  });
}
