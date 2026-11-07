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

test('the menu holds Settings, then the links, in order', async ({ page }) => {
  await page.goto('./');
  await menu(page).click();

  const items = nav(page).getByRole('listitem');

  await expect(items.first()).toHaveText('Settings');
  await expect(items).toHaveCount(LINKS.length + 1);

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

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the menu button at the top right opens a dropdown under it', async ({
    page
  }) => {
    await page.goto('./');

    const button = menu(page);
    const links = page.locator('#mainMenu');

    await expect(button).toBeVisible();
    await expect(links).toBeHidden();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    for (const [name] of LINKS) {
      await expect(nav(page).getByRole('link', { name })).toBeVisible();
    }

    // Right under the header, in line with the button's right edge
    const buttonBox = await button.boundingBox();
    const linksBox = await links.boundingBox();

    expect(linksBox?.y).toBe(64);
    expect(Math.round((linksBox?.x ?? 0) + (linksBox?.width ?? 0))).toBe(
      Math.round((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0))
    );
    expect(linksBox?.width).toBeLessThan(400);

    // The header stays one 64 px bar, where the canvas starts
    expect(
      await page
        .locator('.mc-header')
        .evaluate((el) => (el as HTMLElement).offsetHeight)
    ).toBe(64);
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
