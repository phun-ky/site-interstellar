/**
 * How far the view is panned away from the locked body, in CSS pixels
 * (#118). The camera keeps following the body with this gap; `{0, 0}` keeps
 * it in the middle.
 */
export const lockPan = { x: 0, y: 0 };

/** Dispatched on the document when the view moves off the locked body, or back onto it. */
export const LOCK_PAN_CHANGE = 'interstellar:lockpanchange';

/** Closer than this to the middle, in pixels, the body counts as centred. */
const CENTRED_PX = 0.5;
/** How long Centre takes to bring the body back, in milliseconds. */
const CENTRE_DURATION_MS = 300;

let centring: number | null = null;

/**
 * Whether the view is panned away from the locked body.
 *
 * @returns {boolean} `true` when the body is off the middle.
 *
 * @example
 * ```ts
 * centreButton.ariaDisabled = String(!isOffCentre());
 * ```
 */
export const isOffCentre = (): boolean =>
  Math.hypot(lockPan.x, lockPan.y) >= CENTRED_PX;

/** Sets the gap, and tells the page when the body moves off the middle or back. */
const setLockPan = (x: number, y: number): void => {
  const was = isOffCentre();

  lockPan.x = x;
  lockPan.y = y;

  if (was !== isOffCentre()) {
    globalThis.document?.dispatchEvent(new Event(LOCK_PAN_CHANGE));
  }
};

/**
 * Pans the view by a pointer's movement while a body is locked.
 *
 * @param {number} dx - How far the pointer moved right, in pixels.
 * @param {number} dy - How far it moved down, in pixels.
 *
 * @example
 * ```ts
 * panLocked(event.clientX - lastX, event.clientY - lastY);
 * ```
 */
export const panLocked = (dx: number, dy: number): void => {
  if (centring !== null) cancelAnimationFrame(centring);

  centring = null;
  setLockPan(lockPan.x + dx, lockPan.y + dy);
};

/**
 * Scales the gap as the map zooms, so the point zoomed around stays where it
 * is. While the body is centred it stays centred, as zooming while locked
 * always has.
 *
 * @param {number} factor - The new scale over the old.
 * @param {number} aroundX - The point zoomed around, from the middle of the canvas, in pixels.
 * @param {number} aroundY - The same, down.
 *
 * @example
 * ```ts
 * zoomLockPan(1.1, pointerX - width / 2, pointerY - height / 2);
 * ```
 */
export const zoomLockPan = (
  factor: number,
  aroundX: number,
  aroundY: number
): void => {
  if (!isOffCentre()) return;

  setLockPan(
    aroundX + (lockPan.x - aroundX) * factor,
    aroundY + (lockPan.y - aroundY) * factor
  );
};

/**
 * Puts the locked body back in the middle: at once, or eased over a moment
 * (`animate`, unless the reader prefers reduced motion).
 *
 * @param {boolean} [animate=false] - Whether to ease it there.
 *
 * @example
 * ```ts
 * centreLocked(); // locking on another body
 * centreLocked(true); // the Centre button
 * ```
 */
export const centreLocked = (animate = false): void => {
  if (centring !== null) cancelAnimationFrame(centring);

  centring = null;

  const reduced =
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;

  if (!animate || reduced || !isOffCentre()) {
    setLockPan(0, 0);

    return;
  }

  const from = { ...lockPan };
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / CENTRE_DURATION_MS);
    const left = (1 - progress) ** 3;

    setLockPan(
      progress < 1 ? from.x * left : 0,
      progress < 1 ? from.y * left : 0
    );
    centring = progress < 1 ? requestAnimationFrame(step) : null;
  };

  centring = requestAnimationFrame(step);
};
