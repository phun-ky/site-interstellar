import { expect, type Page } from '@playwright/test';

/** What the page exposes to the tests, through globals the app already sets. */
type AppGlobalsType = {
  PAUSE: boolean;
  LOCKED_CELESTIAL_BODY: { id: string } | null;
  /** The body the focus view shows, opened by clicking it. */
  FOCUSED_CELESTIAL_BODY: { id: string } | null;
  NEAREST_BODIES: Record<string, { x: number; y: number; size: number }>;
  /** The body labels drawn in the current frame. */
  LABEL_BOXES: {
    id: string;
    label: string;
    left: number;
    top: number;
    width: number;
    height: number;
  }[];
  /** Text drawn on the canvas in the last complete frame. */
  __lastFrameText: string[];
  __violations: string[];
};

declare global {
  interface Window {
    __lastFrameText: string[];
    __violations: string[];
  }
}

/**
 * Records, before the app starts, the text each animation frame draws on the
 * canvas and every Content Security Policy violation.
 *
 * @param page - The page to record.
 */
export const recordFrames = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    let current: string[] = [];

    window.__lastFrameText = [];
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__violations.push(
        `${event.effectiveDirective} ${event.blockedURI}`
      )
    );

    const requestFrame = window.requestAnimationFrame.bind(window);

    window.requestAnimationFrame = (callback) =>
      requestFrame((time) => {
        current = [];
        callback(time);
        // Several loops share requestAnimationFrame; keep the frame that drew
        if (current.length) window.__lastFrameText = current;
      });

    const { fillText } = CanvasRenderingContext2D.prototype;

    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      current.push(String(text));

      return fillText.call(this, text, ...rest);
    };
  });
};

/**
 * Collects console errors and uncaught exceptions on the page.
 *
 * @param page - The page to watch.
 * @returns The list, filled in as errors happen.
 */
export const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  return errors;
};

/**
 * Reads app state from the page.
 *
 * @param page - The page.
 * @param read - Reads a value from the app's globals, in the page.
 * @returns The value.
 */
export const readApp = <T>(
  page: Page,
  read: (app: AppGlobalsType) => T
): Promise<T> =>
  page.evaluate(`(${read.toString()})(globalThis)`) as Promise<T>;

/**
 * Opens the app and waits until it has drawn its first frames.
 *
 * @param page - The page.
 */
export const openApp = async (page: Page): Promise<void> => {
  await page.goto('./');
  await expect(
    page.locator('#options input[type=checkbox]').first()
  ).toBeAttached();
  await expect
    .poll(() => readApp(page, (app) => app.__lastFrameText.length))
    .toBeGreaterThan(0);
};

/** Waits for a few frames, so the canvas shows the latest state. */
export const nextFrames = (page: Page): Promise<unknown> =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let left = 3;
        const tick = () =>
          --left ? requestAnimationFrame(tick) : resolve(null);

        requestAnimationFrame(tick);
      })
  );

/**
 * Sums the pixels of the canvas into one number, to tell frames apart.
 *
 * @param page - The page.
 * @returns A checksum of the canvas pixels.
 */
export const canvasChecksum = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;

    for (let i = 0; i < data.length; i += 4) {
      sum = (sum * 31 + data[i] + data[i + 1] * 3 + data[i + 2] * 7) >>> 0;
    }

    return sum;
  });

/**
 * Clicks a Systems toggle's label, as a user does, and waits for the canvas
 * to catch up.
 *
 * @param page - The page.
 * @param id - The toggle's `id`.
 */
export const toggle = async (page: Page, id: string): Promise<void> => {
  const checkbox = page.locator(`#${id}`);
  const wasChecked = await checkbox.isChecked();

  await page.locator(`label[for="${id}"]`).click();
  await expect(checkbox).toBeChecked({ checked: !wasChecked });
  await nextFrames(page);
};

/**
 * Locks on a body through the Lock menu and waits for the zoom to finish.
 *
 * @param page - The page.
 * @param id - The body's id.
 */
export const lockOn = async (page: Page, id: string): Promise<void> => {
  await page.selectOption('#lockOn', id);
  await expect
    .poll(() => readApp(page, (app) => app.LOCKED_CELESTIAL_BODY?.id))
    .toBe(id);
  // The zoom animates for 700 ms
  await page.waitForTimeout(900);
  await nextFrames(page);
};

/**
 * The number of off-screen objects the arrows point at in the last frame.
 * Each arrow's label is a name, followed by ` +n` when it stands for `n` more
 * objects in the same direction.
 *
 * @param labels - The arrow labels.
 * @returns The number of objects.
 */
export const countArrowTargets = (labels: string[]): number =>
  labels.reduce(
    (sum, label) => sum + 1 + Number(label.match(/ \+(\d+)$/)?.[1] ?? 0),
    0
  );
