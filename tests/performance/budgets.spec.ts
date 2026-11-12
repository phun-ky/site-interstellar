import { expect, type Page, test } from '@playwright/test';

/**
 * Performance budgets (#37), measured on a slow phone as Lighthouse's mobile
 * profile does: a 412 px wide viewport, 4x CPU slowdown, 150 ms latency and
 * 1.6 Mbit/s. Each page loads three times and the median counts.
 *
 * Budgets start from the values measured on `main`. Raise one only on
 * purpose, with the reason and the measurement against `main` in the commit.
 */
const BUDGETS: Record<string, Budget> = {
  // Measured on 2026-11-06, 3 x 3 runs: html 1943 B, js 19967 B, css 3813 B,
  // fonts 39808 B, images 1975 B (the favicon), LCP 908-996 ms, CLS 0.007,
  // INP 64-72 ms. html raised from 2300 B for the header navigation (#74):
  // 2782 B measured with it. css raised from 4400 B for the narrow screen
  // layout (#17): 4152 B before it, 4503 B with it. js raised from 23000 B
  // for the @interstellar-tools/constants 2.2.0 bodies (#103): 22946 B
  // before it, 27748 B with it. js raised from 29000 B for the 2.7.0 data
  // (#105), with every body's rotation model, the interstellar objects and
  // the galaxies: 35069 B with it. html raised from 3200 B and js from
  // 37000 B for the views console (#14): html 3195 B before it, 3334 B with
  // it; js 36228 B before it, 37129 B with it. The Bodies drawer loads on
  // its first opening, apart, so its table (2.5 kB) and styles (0.9 kB) are
  // not counted here
  './': {
    bytes: { html: 3400, js: 37_300, css: 5200, fonts: 46_000, images: 2300 },
    lcpMs: 1300,
    cls: 0.02,
    inpMs: 150
  },
  // Measured the same day: html 1082 B, css 3298 B, fonts 19672 B, images
  // 1975 B, LCP 500-520 ms, CLS 0. css raised from 3800 B for the narrow
  // screen layout in main.css (#17): 3643 B before it, 4003 B with it
  'no/such/page': {
    bytes: { html: 1300, css: 4600, fonts: 23_000, images: 2300 },
    lcpMs: 800,
    cls: 0.02
  }
};

type Budget = {
  /** Bytes over the network per resource type, as served. */
  bytes: Partial<Record<ResourceType, number>>;
  lcpMs: number;
  cls: number;
  /** Measured by clicking a Systems toggle; pages without one have none. */
  inpMs?: number;
};

type ResourceType = 'html' | 'js' | 'css' | 'fonts' | 'images' | 'other';

type Measurement = {
  bytes: Partial<Record<ResourceType, number>>;
  lcp: number;
  cls: number;
  inp: number;
};

declare global {
  interface Window {
    __perf: { lcp: number; cls: number; inp: number };
  }
}

/** An event timing entry, with the field the DOM types do not declare yet. */
type EventTiming = PerformanceEntry & { interactionId?: number };

/** A layout shift entry, which the DOM types do not declare yet. */
type LayoutShift = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

const RUNS = 3;
// Lighthouse's slow 4G
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8
};
const CPU_SLOWDOWN = 4;
const TYPES: Record<string, ResourceType> = {
  Document: 'html',
  Script: 'js',
  Stylesheet: 'css',
  Font: 'fonts',
  Image: 'images'
};

const IMAGE_URL = /\.(avif|gif|ico|jpe?g|png|svg|webp)$/;

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Clicks Moons, as a user does: the interaction INP is measured on. */
const toggleMoons = async (page: Page): Promise<void> => {
  await page.locator('label[for="toggleMoons"]').click();
  await expect(page.locator('#toggleMoons')).toBeChecked();
};

const measure = async (
  page: Page,
  path: string,
  interact: boolean
): Promise<Measurement> => {
  const cdp = await page.context().newCDPSession(page);
  const types = new Map<string, ResourceType>();
  const bytes: Measurement['bytes'] = {};

  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  cdp.on('Network.responseReceived', ({ requestId, type, response }) =>
    types.set(
      requestId,
      // Chrome types the favicon `Other`
      TYPES[type] ?? (IMAGE_URL.test(response.url) ? 'images' : 'other')
    )
  );
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const type = types.get(requestId) ?? 'other';

    bytes[type] = (bytes[type] ?? 0) + encodedDataLength;
  });

  // Collected from the start, before the page's own scripts run
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, inp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        window.__perf.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShift[]) {
        if (!entry.hadRecentInput) window.__perf.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTiming[]) {
        if (entry.interactionId) {
          window.__perf.inp = Math.max(window.__perf.inp, entry.duration);
        }
      }
    }).observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16
    } as PerformanceObserverInit);
  });

  await page.goto(path, { waitUntil: 'networkidle' });

  if (interact) await toggleMoons(page);

  // Lets the last entries reach the observers
  await page.waitForTimeout(1000);

  const { lcp, cls, inp } = await page.evaluate(() => window.__perf);

  await cdp.detach();

  return { bytes, lcp, cls, inp };
};

test.use({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 1.75,
  isMobile: true,
  hasTouch: true
});

for (const [path, budget] of Object.entries(BUDGETS)) {
  test(`${path} stays within budget on a slow phone`, async ({ browser }) => {
    const runs: Measurement[] = [];

    for (let run = 0; run < RUNS; run++) {
      const context = await browser.newContext(test.info().project.use);
      const page = await context.newPage();

      try {
        runs.push(await measure(page, path, budget.inpMs !== undefined));
      } finally {
        await context.close();
      }
    }

    const types = [
      ...new Set(runs.flatMap((run) => Object.keys(run.bytes)))
    ] as ResourceType[];
    const result = {
      bytes: Object.fromEntries(
        types.map((type) => [type, median(runs.map((r) => r.bytes[type] ?? 0))])
      ),
      lcpMs: Math.round(median(runs.map((r) => r.lcp))),
      cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
      inpMs: Math.round(median(runs.map((r) => r.inp)))
    };

    test.info().annotations.push({
      type: 'measured',
      description: JSON.stringify(result)
    });
    console.log(`${path} ${JSON.stringify(result)}`);

    for (const [type, limit] of Object.entries(budget.bytes)) {
      expect
        .soft(result.bytes[type] ?? 0, `${type} bytes`)
        .toBeLessThanOrEqual(limit);
    }

    // Every resource type loaded has a budget, so a new kind cannot slip in
    expect
      .soft(
        types.filter((type) => !(type in budget.bytes)),
        'resource types without a budget'
      )
      .toEqual([]);
    expect.soft(result.lcpMs, 'LCP, ms').toBeLessThanOrEqual(budget.lcpMs);
    expect.soft(result.cls, 'CLS').toBeLessThanOrEqual(budget.cls);

    if (budget.inpMs !== undefined) {
      expect.soft(result.inpMs, 'INP, ms').toBeLessThanOrEqual(budget.inpMs);
    }
  });
}
