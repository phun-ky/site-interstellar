import { convertDistanceUnit } from '@interstellar-tools/equations';
import { CelestialBodyType } from '@interstellar-tools/types';

import {
  AU_IN_PX,
  MAX_SCALE,
  MIN_SCALE,
  SCALE,
  THRESHOLD_MOON_RENDER
} from '../../config/constants';
import { prefersReducedMotion } from '../../utils/prefers-reduced-motion';
import { getClearBounds } from '../arrows/utils/get-clear-bounds';
import {
  offsetCacheX,
  offsetCacheY,
  offsetX,
  offsetY
} from '../canvas/config/camera';
import { OPTIONS_UI } from '../canvas/config/hud';
import {
  findBodyById,
  getBodyKind,
  getChildBodies
} from '../celestial-bodies/utils/body-catalog';

import { hideBodyInfo, showBodyInfo } from './body-info';
import { updateScaleDisplay } from './update-scale-display';
import { updateLockStatus } from './update-simulation-status';
import { needsMoonZoom } from './utils/needs-moon-zoom';

/** How far from the click a body still counts as clicked, in pixels. */
const HIT_SLOP_PX = 6;
/** How much of the clear half-view a focused body's neighbourhood fills. */
const FOCUS_FILL = 0.85;
/** How long the focus zoom takes, in milliseconds. */
const ZOOM_DURATION_MS = 700;
/**
 * The smallest neighbourhood a lock frames, in au (15 000 km). Positions are
 * summed from the galactic centre, 1.7 billion au from the Sun, where a
 * double resolves only about 2e-7 au (28 km); framing closer would show that
 * error as a jumping body. Dimorphos, 1.2 km from Didymos, stays within its
 * disc.
 */
const MIN_FOCUS_EXTENT_AU = 1e-4;
/** The layer toggles each kind of body needs to be drawn. */
const LAYERS_BY_KIND: Record<string, string[]> = {
  moon: ['toggleMoons'],
  comet: ['toggleComets'],
  interstellar: ['toggleInterstellar'],
  asteroid: ['toggleAsteroids']
};

let zoomAnimation: number | null = null;

const markZoomingOrPanning = (): void => {
  globalThis.IS_ZOOMING_OR_PANNING = true;

  if (globalThis.ZOOM_PAN_TIMEOUT) clearTimeout(globalThis.ZOOM_PAN_TIMEOUT);

  globalThis.ZOOM_PAN_TIMEOUT = window.setTimeout(() => {
    globalThis.IS_ZOOMING_OR_PANNING = false;
  }, 500);
};
/** Switches on the layers a body needs, so it is drawn once locked. */
const enableLayersFor = (body: CelestialBodyType): void => {
  const kind = getBodyKind(body.id);

  (LAYERS_BY_KIND[kind ?? ''] ?? []).forEach((id) => {
    const toggle = document.getElementById(id) as HTMLInputElement | null;

    if (toggle && !toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
    }
  });
};

/**
 * Locks the camera on a body, or unlocks it with `null`.
 *
 * Locking keeps the body in the centre of the viewport (`draw()` re-centres it
 * every frame), switches on the layer it needs (Moons for a moon, …), shows it
 * in the header and the Lock dropdown, enables the Info button beside it, and
 * closes an open info popup. Unlocking
 * returns the camera to where it was before the lock.
 *
 * @param {CelestialBodyType | null} body - The body to lock on, or `null` to unlock.
 *
 * @example
 * ```ts
 * lockOn(earth);
 * lockOn(null);
 * ```
 */
export const lockOn = (body: CelestialBodyType | null): void => {
  const select = document.getElementById('lockOn') as HTMLSelectElement | null;
  const info = document.getElementById(
    'bodyInfoOpen'
  ) as HTMLButtonElement | null;

  markZoomingOrPanning();

  // The Info button opens the locked body's info, so only while one is locked
  if (info) info.disabled = !body;

  if (!body) {
    if (globalThis.LOCKED_CELESTIAL_BODY) {
      offsetX.value = offsetCacheX.value;
      offsetY.value = offsetCacheY.value;
    }

    globalThis.LOCKED_CELESTIAL_BODY = null;
    updateLockStatus(null);
    hideBodyInfo();

    if (select) select.value = 'noLock';

    return;
  }

  // Remember the free camera, so unlocking can return to it
  if (!globalThis.LOCKED_CELESTIAL_BODY) {
    offsetCacheX.value = offsetX.value;
    offsetCacheY.value = offsetY.value;
  }

  globalThis.LOCKED_CELESTIAL_BODY = body;
  enableLayersFor(body);
  updateLockStatus(body.name);
  // A popup for another body would be stale; clicking opens a new one
  hideBodyInfo();

  if (select) select.value = body.id;
};

/** A child this many times farther out than the previous one starts an outer group. */
const OUTER_GROUP_RATIO = 3;
/**
 * The extent of the inner group of children: sorted by distance, stopping at the
 * first big jump. Jupiter's four large moons reach 0.013 au, but its far, small
 * moons (Himalia, Pasiphae) reach 0.16 au; framing those would cram the large
 * moons together, so the outer group is left to the arrows.
 */
const getCoreExtent = (distances: number[]): number => {
  const sorted = [...distances].sort((a, b) => a - b);

  let extent = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] > extent * OUTER_GROUP_RATIO) break;

    extent = sorted[i];
  }

  return extent;
};
/**
 * Works out a zoom level that shows a body and its neighbourhood: the orbits of
 * what circles it (a star's planets, a planet's moons; see `getCoreExtent()`),
 * or a few hundred times its own size when nothing does. It fits inside the
 * clear area between the HUD panels, and for a planet with moons (when the
 * Moons layer is on) it zooms in far enough for moons to be drawn.
 *
 * @param {CelestialBodyType} body - The body to focus on.
 * @returns {number} The scale to zoom to.
 *
 * @example
 * ```ts
 * zoomTo(getFocusScale(jupiter));
 * ```
 */
const getFocusScale = (body: CelestialBodyType): number => {
  const canvas = document.getElementById('spaceCanvas') as HTMLCanvasElement;
  const width = canvas?.clientWidth || globalThis.innerWidth;
  const height = canvas?.clientHeight || globalThis.innerHeight;
  const bounds = canvas
    ? getClearBounds(canvas, width, height)
    : { left: 0, right: width };
  const halfView =
    Math.min(width / 2 - bounds.left, bounds.right - width / 2, height / 2) *
    FOCUS_FILL;
  // Moons only count when the Moons layer is on, since otherwise they aren't drawn
  const children = getChildBodies(body.id).filter(
    (child) =>
      child.orbit && (OPTIONS_UI.moons || getBodyKind(child.id) !== 'moon')
  );
  const aphelion = ({ orbit }: { orbit?: CelestialBodyType['orbit'] }) =>
    orbit ? convertDistanceUnit(orbit.a, 'au').value * (1 + orbit.e) : 0;
  // A star in a system, such as Sirius A, frames its partners too: the
  // farthest each gets from it, both at the far ends of their orbits (#13)
  const companions =
    getBodyKind(body.id) === 'star' && body.orbit && body.parent
      ? getChildBodies(body.parent).filter(
          (other) => other.id !== body.id && other.orbit
        )
      : [];
  // The farthest any child gets from the body (its aphelion), in au
  const childAphelia = [
    ...children.map(aphelion),
    ...companions.map((other) => aphelion(body) + aphelion(other))
  ];
  // A galaxy is framed whole; anything else a few hundred times its size
  const ownSizeAu =
    convertDistanceUnit(body.radius, 'au').value *
    (getBodyKind(body.id) === 'galaxy' ? 1.2 : 300);
  const extentAu = Math.max(
    childAphelia.length
      ? getCoreExtent(childAphelia) * 1.1
      : Math.max(ownSizeAu, 0.003),
    MIN_FOCUS_EXTENT_AU
  );

  let scale = halfView / (extentAu * AU_IN_PX);

  // Moons are only drawn above THRESHOLD_MOON_RENDER
  if (
    getBodyKind(body.id) === 'planet' &&
    children.some((child) => getBodyKind(child.id) === 'moon')
  ) {
    scale = Math.max(scale, THRESHOLD_MOON_RENDER * 1.25);
  }

  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
};
/**
 * Zooms smoothly to a scale (eased, in log space, so every step feels alike).
 * A new zoom cancels one still running.
 *
 * @param {number} target - The scale to end at.
 *
 * @example
 * ```ts
 * zoomTo(4.5);
 * ```
 */
const zoomTo = (target: number): void => {
  if (zoomAnimation !== null) cancelAnimationFrame(zoomAnimation);

  const scaleDisplay = document.getElementById('scaleDisplay');
  const from = Math.log(SCALE.value);
  const to = Math.log(Math.min(Math.max(target, MIN_SCALE), MAX_SCALE));
  // With reduced motion, jump straight to the target
  const duration = prefersReducedMotion() ? 0 : ZOOM_DURATION_MS;
  const start = performance.now();
  const step = (now: number) => {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1;
    const eased = 1 - (1 - progress) ** 3;

    SCALE.value = Math.exp(from + (to - from) * eased);
    markZoomingOrPanning();

    if (scaleDisplay) updateScaleDisplay(scaleDisplay, SCALE);

    zoomAnimation = progress < 1 ? requestAnimationFrame(step) : null;
  };

  zoomAnimation = requestAnimationFrame(step);
};

/**
 * Finds the body drawn under a point on the canvas, if any: the nearest one
 * whose drawn disc (plus a little slop) contains the point.
 *
 * @param {HTMLCanvasElement} canvas - The simulation canvas.
 * @param {number} clientX - The point's x, in viewport (client) pixels.
 * @param {number} clientY - The point's y, in viewport (client) pixels.
 * @returns {CelestialBodyType | null} The body, or `null` when there is none.
 *
 * @example
 * ```ts
 * const body = getBodyAtPoint(canvas, event.clientX, event.clientY);
 * ```
 */
export const getBodyAtPoint = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): CelestialBodyType | null => {
  const { left, top } = canvas.getBoundingClientRect();
  const x = clientX - left;
  const y = clientY - top;

  let nearestId: string | null = null;
  let nearestDistance = Infinity;

  Object.values(globalThis.NEAREST_BODIES).forEach((tracked) => {
    const distance = Math.hypot(tracked.x - x, tracked.y - y);

    if (
      distance <= Math.max(tracked.size, 4) + HIT_SLOP_PX &&
      distance < nearestDistance
    ) {
      nearestId = tracked.id;
      nearestDistance = distance;
    }
  });

  const body = findBodyById(nearestId ?? undefined);

  if (!body || getBodyKind(body.id) === 'system') return null;

  return body as CelestialBodyType;
};

/**
 * Locks on a body and zooms to show it: what picking it in the Lock dropdown
 * does. Clicking the body does the same and also opens its info popup.
 *
 * @param {CelestialBodyType} body - The body to focus on.
 * @param {boolean} [showInfo=false] - Whether to open the body's info popup.
 *
 * @example
 * ```ts
 * focusOn(jupiter); // from the Lock dropdown
 * focusOn(jupiter, true); // from a click
 * ```
 */
export const focusOn = (body: CelestialBodyType, showInfo = false): void => {
  lockOn(body);
  zoomTo(getFocusScale(body));

  if (showInfo) showBodyInfo(body);
};

/**
 * Zooms to the locked planet again when its moons are too far out to be
 * drawn: what turning the Moons layer on does. Locking with Moons off frames
 * the planet alone, so its moons would stay hidden (#75).
 *
 * @example
 * ```ts
 * moonsToggle.addEventListener('change', () => {
 *   if (moonsToggle.checked) showLockedMoons();
 * });
 * ```
 */
export const showLockedMoons = (): void => {
  const locked = globalThis.LOCKED_CELESTIAL_BODY;

  if (locked && needsMoonZoom(locked.id, SCALE.value)) {
    zoomTo(getFocusScale(locked));
  }
};
