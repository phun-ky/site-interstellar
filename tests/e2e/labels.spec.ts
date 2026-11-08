import { expect, type Page, test } from '@playwright/test';

import {
  lockOn,
  nextFrames,
  openApp,
  readApp,
  recordFrames,
  toggle
} from './helpers';

type BoxType = { left: number; top: number; width: number; height: number };

const overlap = (a: BoxType, b: BoxType): boolean =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

/**
 * The labels drawn in the last frame, and the pairs of them that overlap,
 * along with any label over the locked body's reticle (14 px either side of
 * it at least).
 */
const readLabels = async (page: Page) => {
  await nextFrames(page);

  const { boxes, sun } = await readApp(page, (app) => ({
    boxes: app.LABEL_BOXES,
    sun: app.NEAREST_BODIES.sun
  }));
  const overlapping: string[] = [];

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlap(boxes[i], boxes[j])) {
        overlapping.push(`${boxes[i].label} and ${boxes[j].label}`);
      }
    }
  }

  const half = Math.max(14, sun.size + 8);
  const reticle = {
    left: sun.x - half,
    top: sun.y - half,
    width: 2 * half,
    height: 2 * half
  };
  const overReticle = boxes
    .filter((box) => overlap(box, reticle))
    .map(({ label }) => label);

  return { labels: boxes.map(({ label }) => label), overlapping, overReticle };
};

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

test('locked on the Sun with Comets on, no two labels overlap (#91)', async ({
  page
}) => {
  await openApp(page);
  await toggle(page, 'toggleComets');
  await lockOn(page, 'sun');

  // From the lock's zoom out past 1:46M km, where the issue saw them pile up
  await page.mouse.move(720, 450);

  for (let step = 0; step < 4; step++) {
    const { labels, overlapping, overReticle } = await readLabels(page);

    expect(overlapping).toEqual([]);
    expect(overReticle).toEqual([]);
    // The Sun's label stays, counting the labels it hides. How many others
    // stay depends on where the bodies are, and far enough out it hides all
    expect(labels.find((label) => label.startsWith('SUN'))).toMatch(
      /^SUN \+\d+$/
    );

    for (let notch = 0; notch < 2; notch++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
    }
  }

  await expect(page.locator('#scaleDisplay')).toHaveText(/M KM/);
});

test('labels that are clear of each other are all drawn', async ({ page }) => {
  await openApp(page);
  await lockOn(page, 'earth');

  const { labels } = await readLabels(page);

  expect(labels).toContain('EARTH');
  expect(labels.every((label) => !label.includes('+'))).toBe(true);
});
