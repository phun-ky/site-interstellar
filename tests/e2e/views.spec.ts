import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { nextFrames, openApp, readApp, recordFrames } from './helpers';

const solar = (page: Page) => page.locator('#viewSolarSystem');
const galaxy = (page: Page) => page.locator('#viewGalaxy');
const bodies = (page: Page) => page.locator('#viewBodies');
const drawer = (page: Page) => page.locator('#bodies');
const rows = (page: Page) => page.locator('#bodiesRows tr');
/**
 * Opens the Bodies drawer, and waits for it: it loads on the first click,
 * so it opens a moment later.
 */
const openBodies = async (page: Page): Promise<void> => {
  await bodies(page).click();
  await expect(page.locator('#bodiesSearch')).toBeFocused();
};
/** The locked body's id. */
const locked = (page: Page) =>
  readApp(page, (app) => app.LOCKED_CELESTIAL_BODY?.id ?? null);
/** Whether two elements' boxes overlap. */
const overlap = async (a: Locator, b: Locator): Promise<boolean> => {
  const [x, y] = [await a.boundingBox(), await b.boundingBox()];

  if (!x || !y) return false;

  return (
    x.x < y.x + y.width &&
    y.x < x.x + x.width &&
    x.y < y.y + y.height &&
    y.y < x.y + x.height
  );
};

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('the map opens on the Solar system view: locked on the Sun, its planets drawn', async ({
  page
}) => {
  expect(await locked(page)).toBe('sun');
  await expect(solar(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(galaxy(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#lockOn')).toHaveValue('sun');

  // Framed, with the planets out to Neptune drawn and the Sun in the middle
  await nextFrames(page);

  const drawn = await readApp(page, (app) => app.NEAREST_BODIES);
  const box = await page.locator('canvas').boundingBox();

  for (const id of ['mercury', 'earth', 'jupiter', 'neptune']) {
    const body = drawn[id];

    expect(body, `${id} is drawn`).toBeDefined();
    expect(body.x, `${id} is on screen`).toBeGreaterThan(0);
    expect(body.x).toBeLessThan(box?.width ?? 0);
    expect(body.y).toBeGreaterThan(0);
    expect(body.y).toBeLessThan(box?.height ?? 0);
  }

  expect(Math.abs(drawn.sun.x - (box?.width ?? 0) / 2)).toBeLessThan(2);
  expect(Math.abs(drawn.sun.y - (box?.height ?? 0) / 2)).toBeLessThan(2);
});

test('Galaxy shows the whole Milky Way, and Solar system goes back to the Sun (#14)', async ({
  page
}) => {
  const opening = await page.locator('#scaleDisplay').textContent();

  await galaxy(page).click();
  await expect.poll(() => locked(page)).toBe(null);
  await expect(galaxy(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(solar(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#scaleDisplay')).not.toHaveText(opening ?? '');
  // The galaxy's scale: a scale bar in light years
  await expect(page.locator('#scaleDisplay')).toContainText(/ly/i);

  await solar(page).click();
  await expect.poll(() => locked(page)).toBe('sun');
  await expect(solar(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(galaxy(page)).toHaveAttribute('aria-pressed', 'false');
  // Back at the opening scale, once the zoom has run
  await expect(page.locator('#scaleDisplay')).toHaveText(opening ?? '');

  // Locking on anything else presses neither
  await page.selectOption('#lockOn', 'earth');
  await expect(solar(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(galaxy(page)).toHaveAttribute('aria-pressed', 'false');
});

test('Bodies lists every body, to search, filter and sort (#14)', async ({
  page
}) => {
  await openBodies(page);
  await expect(drawer(page)).toBeVisible();
  await expect(bodies(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#bodiesSearch')).toBeFocused();

  // As many rows as All counts, and the heading says so
  const all = await page.locator('#bodiesKinds button').first().textContent();
  const total = Number(all?.match(/\d+/)?.[0]);

  expect(total).toBeGreaterThan(100);
  await expect(rows(page)).toHaveCount(total);
  await expect(page.locator('#bodiesCount')).toHaveText(String(total));

  // A kind, as many as it counts
  const moons = page.locator('#bodiesKinds button', { hasText: /^Moons/ });
  const moonCount = Number((await moons.textContent())?.match(/\d+/)?.[0]);

  await moons.click();
  await expect(moons).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(page)).toHaveCount(moonCount);

  // A search, within the kind
  await page.locator('#bodiesSearch').fill('ganym');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('th')).toHaveText('Ganymede');
  await page.locator('#bodiesSearch').fill('zzz');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#bodiesEmpty')).toBeVisible();

  // Sorted by eccentricity, up and then down
  await page.locator('#bodiesSearch').fill('');
  await page.getByRole('button', { name: 'Eccentricity, e' }).click();

  const header = page.locator('#bodiesHead th[data-key="e"]');
  const eccentricities = () =>
    rows(page).evaluateAll((trs) =>
      trs
        .map((tr) => tr.querySelectorAll('td')[3]?.textContent ?? '')
        .filter((text) => text !== '-')
        .map(Number)
    );

  await expect(header).toHaveAttribute('aria-sort', 'ascending');

  const up = await eccentricities();

  expect(up).toEqual([...up].sort((a, b) => a - b));
  await page.getByRole('button', { name: 'Eccentricity, e' }).click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');

  const down = await eccentricities();

  expect(down).toEqual([...down].sort((a, b) => b - a));
});

test("a row's Lock button locks on the body and closes the drawer (#14)", async ({
  page
}) => {
  await openBodies(page);
  await page.locator('#bodiesSearch').fill('ganymede');
  await page.getByRole('button', { name: 'Lock on Ganymede' }).click();

  await expect.poll(() => locked(page)).toBe('ganymede');
  await expect(drawer(page)).toBeHidden();
  await expect(bodies(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(bodies(page)).toBeFocused();
  // Moons turned on, so Ganymede is drawn
  await expect(page.locator('#toggleMoons')).toBeChecked();
});

test('Escape and the close button close the drawer, back to Bodies (#14)', async ({
  page
}) => {
  await openBodies(page);
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toBeHidden();
  await expect(bodies(page)).toBeFocused();

  await openBodies(page);
  await page.locator('#bodiesClose').click();
  await expect(drawer(page)).toBeHidden();
  await expect(bodies(page)).toBeFocused();
});

test('Solar system and Galaxy close the drawer, to show the map (#14)', async ({
  page
}) => {
  await openBodies(page);
  await solar(page).click();
  await expect(drawer(page)).toBeHidden();
  await expect(bodies(page)).toHaveAttribute('aria-expanded', 'false');

  await openBodies(page);
  await galaxy(page).click();
  await expect(drawer(page)).toBeHidden();
  await expect(bodies(page)).toHaveAttribute('aria-expanded', 'false');
});

test('the open drawer has no accessibility violations (#14)', async ({
  page
}) => {
  await openBodies(page);
  await page.getByRole('button', { name: 'Semi-major axis, a' }).click();

  const { violations } = await new AxeBuilder({ page })
    .include('#bodies')
    .include('.mc-views')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  expect(violations.map(({ id }) => id)).toEqual([]);
});

test('the info popup sits above the console, and opening Bodies closes it (#14)', async ({
  page
}) => {
  await page.selectOption('#lockOn', 'earth');
  await page.locator('#bodyInfoOpen').click();
  await expect(page.locator('#bodyInfo')).toBeVisible();
  expect(
    await overlap(page.locator('#bodyInfo'), page.locator('.mc-views'))
  ).toBe(false);

  await openBodies(page);
  await expect(page.locator('#bodyInfo')).toBeHidden();
  expect(await overlap(drawer(page), page.locator('.mc-views'))).toBe(false);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the console sits above the bottom bar, clear of the minimap, and the drawer above it (#14)', async ({
    page
  }) => {
    const views = page.locator('.mc-views');

    await expect(views).toBeVisible();
    expect(await overlap(views, page.locator('.mc-dock'))).toBe(false);
    expect(await overlap(views, page.locator('#minimap'))).toBe(false);

    await openBodies(page);
    await expect(drawer(page)).toBeVisible();
    expect(await overlap(drawer(page), views)).toBe(false);
    expect(await overlap(drawer(page), page.locator('.mc-dock'))).toBe(false);
  });

  test('opening the Systems sheet closes the drawer (#14)', async ({
    page
  }) => {
    await openBodies(page);
    await page.locator('#systemsToggle').click();
    await expect(drawer(page)).toBeHidden();
    await expect(page.locator('#systems')).toHaveClass(/is-open/);
  });
});
