import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { openApp, recordFrames } from './helpers';

const menuButton = (page: Page) => page.locator('#menuToggle');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' });

/** Opens Settings from the header menu. */
const openSettings = async (page: Page) => {
  // Behind the menu button only where the header row doesn't fit
  if (await menuButton(page).isVisible()) await menuButton(page).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(dialog(page)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await recordFrames(page);
});

for (const [name, viewport] of [
  ['a wide screen', { width: 1440, height: 900 }],
  ['a phone', { width: 390, height: 844 }]
] as const) {
  test.describe(`on ${name}`, () => {
    test.use({ viewport });

    test('Settings opens from the menu as a modal dialog that fits the screen', async ({
      page
    }) => {
      await openApp(page);
      await openSettings(page);

      // The menu closes behind it, and the map can't be reached until it closes
      await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
      expect(
        await page.locator('#settings').evaluate((el) => el.matches(':modal'))
      ).toBe(true);
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('#settings')
        )
      ).toBe(true);

      // A switch for each sound, all off
      for (const sound of [
        'Background ambience',
        'Switch clicks',
        'Zoom ticks'
      ]) {
        await expect(
          dialog(page).getByRole('checkbox', { name: sound })
        ).not.toBeChecked();
      }

      const box = await page.locator('#settings').boundingBox();

      expect(box?.x).toBeGreaterThanOrEqual(16);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        viewport.width - 16
      );
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
        viewport.height
      );
    });

    test('the open dialog has no axe findings', async ({ page }) => {
      await openApp(page);
      await openSettings(page);

      const { violations } = await new AxeBuilder({ page })
        .withTags([
          'wcag2a',
          'wcag2aa',
          'wcag21aa',
          'wcag22aa',
          'best-practice'
        ])
        .analyze();

      expect(violations.map(({ id }) => id)).toEqual([]);
    });
  });
}

for (const [name, viewport, opener] of [
  ['a wide screen', { width: 1440, height: 900 }, '#settingsOpen'],
  ['a phone', { width: 390, height: 844 }, '#menuToggle']
] as const) {
  test.describe(`closing Settings on ${name}`, () => {
    test.use({ viewport });

    test(`Escape, the close button or a click outside closes it, and focus returns to ${opener}`, async ({
      page
    }) => {
      await openApp(page);

      await openSettings(page);
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toBeHidden();
      await expect(page.locator(opener)).toBeFocused();

      await openSettings(page);
      await dialog(page).getByRole('button', { name: 'Close' }).click();
      await expect(dialog(page)).toBeHidden();
      await expect(page.locator(opener)).toBeFocused();

      await openSettings(page);
      await page.mouse.click(10, viewport.height - 120);
      await expect(dialog(page)).toBeHidden();
      await expect(page.locator(opener)).toBeFocused();
    });
  });
}

test.describe('closing Settings', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a setting stays as it was left when Settings opens again', async ({
    page
  }) => {
    await openApp(page);
    await openSettings(page);
    await page.locator('label[for="soundTicks"]').click();
    await page.keyboard.press('Escape');

    await openSettings(page);
    await expect(page.locator('#soundTicks')).toBeChecked();
  });
});
