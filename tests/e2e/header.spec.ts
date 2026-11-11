import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/** The header links, in order: accessible name, target, and whether `↗` shows. */
const LINKS: [string, string, boolean][] = [
  ['Tools', 'https://phun-ky.net/interstellar-tools/', false],
  ['Sponsor', 'https://github.com/sponsors/phun-ky', true],
  [
    'Contributing',
    'https://github.com/phun-ky/site-interstellar/blob/main/CONTRIBUTING.md',
    true
  ],
  ['GitHub repository', 'https://github.com/phun-ky/site-interstellar', false]
];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const menu = (page: Page) => nav(page).getByRole('button', { name: 'Menu' });

test('the brand links to the map', async ({ page, baseURL }) => {
  await page.goto('./');

  const brand = page.getByRole('banner').getByRole('link', {
    name: 'Interstellar'
  });

  expect(new URL((await brand.getAttribute('href')) ?? '', baseURL).href).toBe(
    baseURL
  );
});

test('the header holds the links, then Settings, then GitHub, in order', async ({
  page
}) => {
  await page.goto('./');

  const items = nav(page).getByRole('listitem');

  await expect(items).toHaveCount(LINKS.length + 1);
  await expect(items.nth(3)).toHaveText('Settings');

  const links = nav(page).getByRole('link');

  await expect(links).toHaveCount(LINKS.length);

  for (const [index, [name, href, external]] of LINKS.entries()) {
    const link = links.nth(index);

    await expect(link).toHaveAccessibleName(name);
    await expect(link).toHaveAttribute('href', href);
    await expect(link.locator('.mc-external')).toHaveCount(external ? 1 : 0);

    if (external) await expect(link).toContainText('↗');
  }
});

for (const width of [1440, 1024, 880]) {
  test.describe(`at ${width} px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the items are in a row, with no menu button', async ({ page }) => {
      await page.goto('./');

      await expect(menu(page)).toBeHidden();
      await expect(
        nav(page).getByRole('button', { name: 'Settings' })
      ).toBeVisible();

      for (const [name] of LINKS) {
        await expect(nav(page).getByRole('link', { name })).toBeVisible();
      }

      // One row, at the same height, ending at the gutter
      const boxes = await nav(page)
        .getByRole('listitem')
        .evaluateAll((items) =>
          items.map((item) => item.getBoundingClientRect().top)
        );

      expect(new Set(boxes).size).toBe(1);

      const header = page.locator('.mc-header');

      expect(
        await header.evaluate((el) => (el as HTMLElement).offsetHeight)
      ).toBe(64);
      expect(
        await header.evaluate((el) => el.scrollWidth - el.clientWidth)
      ).toBe(0);
    });

    test('a long lock name ends in an ellipsis, and the row stays', async ({
      page
    }) => {
      await page.goto('./');

      // Below 1024 px the Lock menu is in the Systems sheet
      if (await page.locator('#systemsToggle').isVisible()) {
        await page.locator('#systemsToggle').click();
      }

      await page.selectOption('#lockOn', 'sagittarius-dwarf');

      const header = page.locator('.mc-header');

      await expect(page.locator('#lockStatus')).toBeVisible();
      await expect(menu(page)).toBeHidden();
      expect(
        await header.evaluate((el) => (el as HTMLElement).offsetHeight)
      ).toBe(64);
      expect(
        await header.evaluate((el) => el.scrollWidth - el.clientWidth)
      ).toBe(0);
    });
  });
}

test.describe('just too narrow for the row, at 879 px', () => {
  test.use({ viewport: { width: 879, height: 900 } });

  test('the menu button opens the same items, in the same order', async ({
    page
  }) => {
    await page.goto('./');

    await expect(nav(page).getByRole('link', { name: 'Tools' })).toBeHidden();
    await menu(page).click();
    await expect(menu(page)).toHaveAttribute('aria-expanded', 'true');

    const items = nav(page).getByRole('listitem');

    await expect(items.nth(3)).toHaveText('Settings');
    await expect(items.nth(4)).toHaveText('GitHub');
    await expect(nav(page).getByRole('link', { name: 'Tools' })).toBeVisible();
  });
});

test.describe('on a narrow screen', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the menu button opens and closes the links', async ({ page }) => {
    await page.goto('./');

    const button = menu(page);
    const tools = nav(page).getByRole('link', { name: 'Tools' });

    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(tools).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    for (const [name] of LINKS) {
      await expect(nav(page).getByRole('link', { name })).toBeVisible();
    }

    // Escape closes the menu and returns focus to its button
    await tools.focus();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    await expect(tools).toBeHidden();

    // A click outside the navigation closes it too
    await button.click();
    await page.mouse.click(200, 600);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('the open menu has no axe findings', async ({ page }) => {
    await page.goto('./');
    await menu(page).click();

    const { violations } = await new AxeBuilder({ page })
      .include('.mc-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    expect(violations.map(({ id }) => id)).toEqual([]);
  });

  test('the header stays one 64 px bar with a long lock name', async ({
    page
  }) => {
    await page.goto('./');
    // The Lock menu is in the Systems sheet on a narrow screen
    await page.locator('#systemsToggle').click();
    await page.selectOption('#lockOn', 'alpha-centauri-a');

    const header = page.locator('.mc-header');

    await expect(page.locator('#lockStatus')).toBeVisible();
    expect(
      await header.evaluate((el) => (el as HTMLElement).offsetHeight)
    ).toBe(64);
    expect(await header.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
      0
    );
  });
});
