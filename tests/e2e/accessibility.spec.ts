import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { lockOn, nextFrames, openApp, recordFrames } from './helpers';

/** WCAG 2.2 A and AA, and axe's best practices. */
const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice'
];

/** Every control, in Tab order. */
const TAB_ORDER = [
  'skip link',
  'link Interstellar',
  'link Tools',
  'link Sponsor',
  'link Contributing',
  'link Changelog',
  '#settingsOpen',
  'link GitHub repository',
  '#toggleMoons',
  '#toggleAsteroidBelts',
  '#toggleAsteroids',
  '#toggleComets',
  '#toggleInterstellar',
  '#toggleStarfield',
  '#toggleArrowheads',
  '#toggleLabels',
  '#toggleTrajectory',
  '#arrowCount',
  '#toggleTrajectoryType',
  '#speedMode',
  '#lockOn',
  '#pause',
  '#resetToNow'
];

const axeViolations = async (page: Page): Promise<string[]> => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze();

  return violations.map(
    ({ id, nodes }) =>
      `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`
  );
};

/** Describes the focused element and whether its focus can be seen. */
const describeFocus = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    // A Systems toggle hides its checkbox and outlines its label instead
    const shown =
      element.matches('input[type=checkbox]') && element.nextElementSibling
        ? (element.nextElementSibling as HTMLElement)
        : element;
    const { outlineStyle, outlineWidth } = getComputedStyle(shown);
    const box = shown.getBoundingClientRect();

    return {
      id: element.matches('.mc-skip')
        ? 'skip link'
        : element.id
          ? `#${element.id}`
          : // A header link: its accessible name, without the `↗`
            `link ${element.getAttribute('aria-label') ?? element.textContent?.replace('↗', '').trim()}`,
      outlined: outlineStyle !== 'none' && parseFloat(outlineWidth) > 0,
      onScreen:
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.top < innerHeight &&
        box.right > 0 &&
        box.left < innerWidth
    };
  });

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
  await openApp(page);
});

test('axe finds no WCAG 2.2 AA violations on load', async ({ page }) => {
  expect(await axeViolations(page)).toEqual([]);
});

test('axe finds no violations with a body locked, held and its info open', async ({
  page
}) => {
  await lockOn(page, 'jupiter');
  await page.locator('#pause').click();

  const canvas = await page.locator('canvas').boundingBox();

  await page.mouse.click(
    (canvas?.x ?? 0) + (canvas?.width ?? 0) / 2,
    (canvas?.y ?? 0) + (canvas?.height ?? 0) / 2
  );
  await expect(page.locator('#bodyInfo')).toBeVisible();
  await expect(page.locator('#lockStatus')).toBeVisible();

  expect(await axeViolations(page)).toEqual([]);
});

test('every control is reached with Tab, in order, with visible focus', async ({
  page
}) => {
  const reached: Awaited<ReturnType<typeof describeFocus>>[] = [];

  for (let i = 0; i < TAB_ORDER.length; i++) {
    await page.keyboard.press('Tab');
    reached.push(await describeFocus(page));
  }

  expect(reached.map(({ id }) => id)).toEqual(TAB_ORDER);

  for (const { id, outlined, onScreen } of reached) {
    expect(outlined, `${id} shows its focus`).toBe(true);
    expect(onScreen, `${id} is on screen when focused`).toBe(true);
  }
});

test('the skip link moves focus to Systems', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to systems' })
  ).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#systems')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('#toggleMoons')).toBeFocused();
});

test('Space switches a layer, and Escape closes the body info', async ({
  page
}) => {
  const moons = page.locator('#toggleMoons');

  await moons.focus();
  await page.keyboard.press('Space');
  await expect(moons).toBeChecked();
  await page.keyboard.press('Space');
  await expect(moons).not.toBeChecked();

  await lockOn(page, 'sun');

  const canvas = await page.locator('canvas').boundingBox();

  await page.mouse.click(
    (canvas?.x ?? 0) + (canvas?.width ?? 0) / 2,
    (canvas?.y ?? 0) + (canvas?.height ?? 0) / 2
  );
  await expect(page.locator('#bodyInfo')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bodyInfo')).toBeHidden();
});

test('the page has landmarks and the canvas a text alternative', async ({
  page
}) => {
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(
    page.getByRole('complementary', { name: 'Systems' })
  ).toHaveCount(1);
  await expect(
    page.getByRole('main').getByRole('img', { name: /solar system/ })
  ).toHaveCount(1);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('locking on jumps to the body without animating the zoom', async ({
    page
  }) => {
    await page.selectOption('#lockOn', 'jupiter');
    await nextFrames(page);

    const zoomAfterTwoFrames = await page.locator('#zoomLevel').innerText();

    await page.waitForTimeout(900);
    expect(await page.locator('#zoomLevel').innerText()).toBe(
      zoomAfterTwoFrames
    );
  });
});

test('without reduced motion, locking on animates the zoom', async ({
  page
}) => {
  await page.selectOption('#lockOn', 'jupiter');
  await nextFrames(page);

  const zoomAfterTwoFrames = await page.locator('#zoomLevel').innerText();

  await page.waitForTimeout(900);
  expect(await page.locator('#zoomLevel').innerText()).not.toBe(
    zoomAfterTwoFrames
  );
});

test.describe('the body info, from the keyboard (#90)', () => {
  const info = (page: Page) => page.locator('#bodyInfoOpen');
  const panel = (page: Page) => page.locator('#bodyInfo');

  test('Info by the Lock menu opens the locked body, and Escape or Close returns focus', async ({
    page
  }) => {
    await expect(info(page)).toBeDisabled();

    // Lock on Jupiter by typing its name into the focused Lock menu
    await page.locator('#lockOn').focus();
    await page.keyboard.type('Jupiter');
    await expect(page.locator('#lockOn')).toHaveValue('jupiter');
    await expect(panel(page)).toBeHidden();
    await expect(info(page)).toBeEnabled();

    // Info is the next stop, and opens the panel with focus in it
    await page.keyboard.press('Tab');
    await expect(info(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toBeFocused();
    await expect(page.locator('#bodyInfoTitle')).toHaveText('Jupiter');
    await expect(info(page)).toHaveAttribute('aria-expanded', 'true');
    expect(
      await panel(page).evaluate((el) => getComputedStyle(el).outlineStyle)
    ).not.toBe('none');

    // Escape closes it, and focus is back on Info
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(info(page)).toBeFocused();
    await expect(info(page)).toHaveAttribute('aria-expanded', 'false');

    // So does Close
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.locator('#bodyInfoClose')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeHidden();
    await expect(info(page)).toBeFocused();

    // Info again while it is open closes it
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await info(page).click();
    await expect(panel(page)).toBeHidden();

    // Unlocked, there is nothing to show
    await page.selectOption('#lockOn', 'noLock');
    await expect(info(page)).toBeDisabled();
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('Info closes the Systems sheet, and Escape returns focus to Systems', async ({
      page
    }) => {
      await page.locator('#systemsToggle').click();
      await page.selectOption('#lockOn', 'jupiter');
      await info(page).click();

      await expect(page.locator('#systems')).toBeHidden();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toBeFocused();
      await expect(page.locator('#bodyInfoTitle')).toHaveText('Jupiter');

      await page.keyboard.press('Escape');
      await expect(panel(page)).toBeHidden();
      await expect(page.locator('#systemsToggle')).toBeFocused();
    });
  });
});
