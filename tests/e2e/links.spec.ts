import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import {
  type APIRequestContext,
  expect,
  type Page,
  test
} from '@playwright/test';

import {
  BODY_IMAGES,
  getImageSources
} from '../../src/features/ui/utils/body-images';

import { recordFrames } from './helpers';

/** The built site, as the tests serve it. */
const DIST = join(import.meta.dirname, '../../dist');

/** The built pages, relative to the base URL. */
const PAGES = ['./', '404.html'];

/** Every `href` and `src` on the page, resolved, on the site's own origin. */
const linksOn = async (page: Page): Promise<string[]> => {
  const origin = new URL(page.url()).origin;
  const urls = await page.evaluate(() =>
    [...document.querySelectorAll('[href], [src]')].map(
      (element) =>
        new URL(
          element.getAttribute('href') ?? element.getAttribute('src') ?? '',
          document.baseURI
        ).href
    )
  );

  return urls.filter((url) => new URL(url).origin === origin);
};

/** The files a stylesheet loads through `url(...)`, resolved. */
const urlsInStylesheet = async (
  request: APIRequestContext,
  stylesheet: string
): Promise<string[]> => {
  const css = await (await request.get(stylesheet)).text();

  return [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)]
    .map(([, url]) => url)
    .filter((url) => !url.startsWith('data:'))
    .map((url) => new URL(url, stylesheet).href);
};

/** The icons and start URL in the web manifest, resolved. */
const urlsInManifest = async (
  request: APIRequestContext,
  manifest: string
): Promise<string[]> => {
  const { icons, start_url: startUrl } = await (
    await request.get(manifest)
  ).json();

  return [
    new URL(startUrl, manifest).href,
    ...icons.map(({ src }: { src: string }) => new URL(src, manifest).href)
  ];
};

/** The images `browserconfig.xml` names, resolved. */
const urlsInBrowserConfig = async (
  request: APIRequestContext,
  config: string
): Promise<string[]> => {
  const xml = await (await request.get(config)).text();

  return [...xml.matchAll(/src="([^"]+)"/g)].map(
    ([, src]) => new URL(src, config).href
  );
};

/** The social card and other images named in `<meta>` tags, on the site's own origin. */
const metaImagesOn = async (page: Page): Promise<string[]> => {
  const contents = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'meta[property="og:image"], meta[name="twitter:image"]'
      )
    ].map((meta) => meta.getAttribute('content') ?? '')
  );

  // They name the live site; the same path on the test server is the same file
  return contents.map(
    (content) =>
      new URL(new URL(content).pathname.replace(/^\//, ''), SERVER_ROOT).href
  );
};

/** The source map a script names in its `sourceMappingURL` comment, resolved. */
const sourceMapOf = async (
  request: APIRequestContext,
  script: string
): Promise<string[]> => {
  const js = await (await request.get(script)).text();
  const map = js.match(/\/\/# sourceMappingURL=(\S+)\s*$/)?.[1];

  return map ? [new URL(map, script).href] : [];
};

/**
 * The site's own files a script names, such as the background sound it plays
 * on request: quoted paths relative to the site, resolved against `baseURL`,
 * and the scripts it imports by a path relative to itself (`./x.js`), as a
 * lazily loaded module with no styles of its own is.
 */
const filesNamedIn = async (
  request: APIRequestContext,
  script: string,
  baseURL: string
): Promise<string[]> => {
  const js = await (await request.get(script)).text();

  return [
    ...[
      ...js.matchAll(
        /["'`]([a-z][\w-]*(?:\/[\w.-]+)+\.(?:webm|m4a|mp3|ogg|png|svg|jpg|webp|js|css))["'`]/g
      )
    ].map(([, path]) => new URL(path, baseURL).href),
    ...[...js.matchAll(/import\(\s*["'`](\.\/[\w.-]+\.js)["'`]/g)].map(
      ([, path]) => new URL(path, script).href
    )
  ];
};

/** The test server's root, where the site's path starts. */
const SERVER_ROOT = 'http://127.0.0.1:3000/';

/**
 * Every file the built site asks for: the pages, what they link and load, what
 * their stylesheets, scripts and manifest load in turn (a script's source map
 * and the files it names, such as a script it loads later), the social card,
 * the images in `browserconfig.xml`, which browsers ask for by convention,
 * and the bodies' images, which the focus view asks for from its list
 * (#126).
 */
const reachableUrls = async (
  page: Page,
  request: APIRequestContext,
  baseURL: string
): Promise<Set<string>> => {
  const urls = new Set<string>([new URL('browserconfig.xml', baseURL).href]);

  for (const path of PAGES) {
    await page.goto(path);
    urls.add(page.url());

    for (const url of await linksOn(page)) urls.add(url);
    for (const url of await metaImagesOn(page)) urls.add(url);
  }

  // Including what is found on the way: a lazily loaded script (#14), and
  // its source map and styles
  for (const url of urls) {
    const { pathname } = new URL(url);

    if (pathname.endsWith('.css')) {
      for (const asset of await urlsInStylesheet(request, url)) urls.add(asset);
    } else if (pathname.endsWith('.js')) {
      for (const asset of await sourceMapOf(request, url)) urls.add(asset);
      for (const asset of await filesNamedIn(request, url, baseURL)) {
        urls.add(asset);
      }
    } else if (pathname.endsWith('manifest.json')) {
      for (const asset of await urlsInManifest(request, url)) urls.add(asset);
    }
  }

  for (const url of await urlsInBrowserConfig(
    request,
    new URL('browserconfig.xml', baseURL).href
  )) {
    urls.add(url);
  }

  for (const id of Object.keys(BODY_IMAGES)) {
    const { srcset } = getImageSources(id, '');

    for (const candidate of srcset.split(', ')) {
      urls.add(new URL(candidate.split(' ')[0], baseURL).href);
    }
  }

  return urls;
};

/** Every file in the build, relative to `dist/`. */
const builtFiles = (dir = DIST, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? builtFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`]
  );

test('every internal link and asset in the built pages resolves', async ({
  page,
  request,
  baseURL
}) => {
  const urls = await reachableUrls(page, request, baseURL ?? '');
  const broken: string[] = [];

  for (const url of urls) {
    const { status } = await request.fetch(url).then((response) => ({
      status: response.status()
    }));

    if (status !== 200) broken.push(`${status} ${url}`);
  }

  // The fonts, the manifest icons and the pages themselves, at the least
  expect(urls.size).toBeGreaterThan(20);
  expect(broken).toEqual([]);
});

test('the build ships no file the site never asks for', async ({
  page,
  request,
  baseURL
}) => {
  const base = baseURL ?? '';
  const asked = new Set(
    [...(await reachableUrls(page, request, base))].map((url) =>
      decodeURIComponent(url.slice(base.length) || 'index.html')
    )
  );

  expect(builtFiles().filter((file) => !asked.has(file))).toEqual([]);
});

test.describe('an unknown path', () => {
  const UNKNOWN = 'no/such/page';

  test('answers 404 with the Signal lost page', async ({ request }) => {
    const response = await request.get(UNKNOWN);

    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('Signal lost');
  });

  test('shows the page without policy violations or axe findings', async ({
    page
  }) => {
    await recordFrames(page);

    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(UNKNOWN);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Signal lost' })
    ).toBeVisible();
    // The page itself answers 404, which the browser logs; nothing else may
    expect(errors.filter((error) => !/status of 404/.test(error))).toEqual([]);
    expect(await page.evaluate(() => window.__violations)).toEqual([]);

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    expect(violations.map(({ id }) => id)).toEqual([]);
  });

  test('links back to the map', async ({ page }) => {
    await page.goto(UNKNOWN);
    await page.getByRole('link', { name: 'Return to the map' }).click();

    await expect(page).toHaveTitle('Interstellar');
    await expect(page.locator('#spaceCanvas')).toBeVisible();
  });
});
