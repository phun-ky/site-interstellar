import { convertDistanceUnit } from '@interstellar-tools/equations';
import { CelestialBodyType } from '@interstellar-tools/types';

import { AU_IN_PX, MAX_SCALE, MIN_SCALE, SCALE } from '../../config/constants';
import { OrbitingBodyType } from '../../types/orbiting-bodies';
import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { prefersReducedMotion } from '../../utils/prefers-reduced-motion';
import '../../styles/focus.css';
import { offsetX, offsetY } from '../canvas/config/camera';
import { drawFocusBody } from '../celestial-bodies/draw-focus-body';
import {
  BODY_KIND_LABELS,
  findBodyById,
  getBodyKind
} from '../celestial-bodies/utils/body-catalog';
import { getAbsolutePosition } from '../celestial-bodies/utils/get-absolute-position';
import { getOrbitState } from '../celestial-bodies/utils/get-orbit-state';
import { drawSystemMap } from '../minimap/draw-system-map';
import { updateMinimap } from '../minimap/update-minimap';
import { getSystemMap } from '../minimap/utils/get-system-map';

import { getBodyFacts, hideBodyInfo } from './body-info';
import { getFocusShift, setFocusOverlay, setFocusShift } from './focus-state';
import { enableLayersFor, LOCK_CHANGE, markZoomingOrPanning } from './lock-on';
import { updateScaleDisplay } from './update-scale-display';
import {
  updateLockStatus,
  updateSimulationStatus
} from './update-simulation-status';
import {
  getBodyImage,
  getCreditText,
  getImageSources,
  LICENCE_URLS
} from './utils/body-images';
import { getDesignation, getGauges, getPath } from './utils/focus-facts';

/** The most of the clear height the focused body's disc may cover. */
const MAX_HEIGHT_SHARE = 2 / 3;
/** The most of the clear width it may cover. */
const MAX_WIDTH_SHARE = 0.8;
/** How long zooming in and out takes, in milliseconds. */
const DURATION_MS = 900;
/** How much room is kept round the clicked body when zoomed out to its parent. */
const PARENT_MARGIN = 1.35;
/** How many frames pass between updates of the live readouts. */
const LIVE_EVERY = 6;
/**
 * Where the focus view is a sheet at the bottom (as in focus.css): the body's
 * image goes in the sheet, under its name, rather than top right.
 */
const NARROW = '(max-width: 1023px)';
/** How wide the image is drawn: the sheet's width, or the 240 px frame. */
const IMAGE_SIZES = '(max-width: 1023px) calc(100vw - 72px), 240px';

let animation: number | null = null;
let liveLoop: number | null = null;
/** Whether time was held before the focus view held it, to restore on close. */
let wasPaused = false;
/** What had keyboard focus before the view opened, to return it on close. */
let returnFocus: HTMLElement | null = null;

const getCanvas = () =>
  document.getElementById('spaceCanvas') as HTMLCanvasElement | null;
/** Reads a number the focus view's CSS sets, such as `--int-focus-size`. */
const readNumber = (element: Element, name: string): number =>
  Number(getComputedStyle(element).getPropertyValue(name).trim()) || 0;
/**
 * Sets where the focused body sits, and tells the CSS where its middle is
 * (`--int-focus-x`), so the controls under it line up with it.
 */
const setShift = (next: { x: number; y: number }): void => {
  const width = getCanvas()?.clientWidth || globalThis.innerWidth;

  setFocusShift(next);
  document.documentElement.style.setProperty(
    '--int-focus-x',
    `${width / 2 + next.x}px`
  );
};
/**
 * The space the body has: the whole canvas, or on a narrow screen
 * (`--int-focus-anchor: bottom`) the space above the info sheet, less
 * `--int-focus-reserve-top` for the close button and the map.
 */
const getClearArea = () => {
  const canvas = getCanvas();
  const panel = document.getElementById('focusView');
  const width = canvas?.clientWidth || globalThis.innerWidth;
  const height = canvas?.clientHeight || globalThis.innerHeight;

  if (
    !panel ||
    panel.hidden ||
    getComputedStyle(panel).getPropertyValue('--int-focus-anchor').trim() !==
      'bottom'
  ) {
    return { width, height, x: 0, y: 0 };
  }

  const top = panel.offsetTop - (canvas?.offsetTop ?? 0);
  const reserve = readNumber(panel, '--int-focus-reserve-top');

  return {
    width,
    height: top - reserve,
    x: 0,
    y: (top + reserve - height) / 2
  };
};
/**
 * The scale that makes the body's disc cover its share of the clear height
 * (`--int-focus-size`, at most 2/3), and no more than most of its width.
 */
const getFocusViewScale = (body: OrbitingBodyType, area = getClearArea()) => {
  const panel = document.getElementById('focusView');
  const share = panel ? readNumber(panel, '--int-focus-size') : 0;
  const radiusAu =
    'radius' in body && body.radius
      ? convertDistanceUnit(body.radius, 'au').value
      : 1e-5;
  const radiusPx = Math.min(
    (area.height *
      (share > 0 ? Math.min(share, MAX_HEIGHT_SHARE) : MAX_HEIGHT_SHARE)) /
      2,
    (area.width * MAX_WIDTH_SHARE) / 2
  );

  return Math.min(
    Math.max(radiusPx / (radiusAu * AU_IN_PX), MIN_SCALE),
    MAX_SCALE
  );
};
/** The camera offsets that put a body in the middle of the canvas, at a scale. */
const getCentreOffsets = (body: OrbitingBodyType, scale: number) => {
  const { x, y } = getAbsolutePosition(body);

  return {
    x: -distanceToPixels(x, { value: scale }),
    y: -distanceToPixels(y, { value: scale })
  };
};
/** Eases the scale (in log space) and, given `pan`, the camera, then calls `done`. */
const animate = (
  target: number,
  pan: ((scale: number, eased: number) => void) | null,
  done?: () => void
): void => {
  if (animation !== null) cancelAnimationFrame(animation);

  const scaleDisplay = document.getElementById('scaleDisplay');
  const from = Math.log(SCALE.value);
  const to = Math.log(target);
  const duration = prefersReducedMotion() ? 0 : DURATION_MS;
  const start = performance.now();
  const step = (now: number) => {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1;
    // Ease in and out, so the camera leaves and lands gently
    const eased =
      progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

    SCALE.value = Math.exp(from + (to - from) * eased);
    pan?.(SCALE.value, eased);
    markZoomingOrPanning();

    if (scaleDisplay) updateScaleDisplay(scaleDisplay, SCALE);

    if (progress < 1) {
      animation = requestAnimationFrame(step);
    } else {
      animation = null;
      done?.();
    }
  };

  animation = requestAnimationFrame(step);
};
/**
 * Shows the body in its system on the minimap, and keeps that and the live
 * readouts (range, bearing, speed and the clock) up to date while the view
 * is open.
 */
const startLive = (body: OrbitingBodyType): void => {
  const minimap = document.getElementById('minimap');
  const system = getSystemMap(body);
  const caption = document.getElementById('focusMapCaption');
  const range = document.getElementById('focusRange');
  const bearing = document.getElementById('focusBearing');
  const speed = document.getElementById('focusSpeed');
  const clock = document.getElementById('focusClock');
  const simDate = document.getElementById('simDate');

  if (!minimap) return;

  minimap.hidden = false;

  if (caption) caption.textContent = system ? system.name : 'Milky Way';

  let canvas: HTMLCanvasElement | null = null;

  if (system) {
    canvas = document.createElement('canvas');
    canvas.className = 'int mc-system-map';
    minimap.replaceChildren(canvas);
  } else {
    updateMinimap(body);
  }

  let frame = 0;

  const tick = () => {
    if (canvas && system) drawSystemMap(canvas, system);

    if (frame++ % LIVE_EVERY === 0) {
      if (clock && simDate) clock.textContent = simDate.textContent;

      if (body.orbit) {
        const live = getOrbitState(body);

        if (range) range.textContent = `${live.range.toFixed(6)} au`;

        if (bearing) {
          bearing.textContent = `${live.bearing.toFixed(2).padStart(6, '0')}°`;
        }

        if (speed) {
          speed.textContent =
            live.speed === null ? 'n/a' : `${live.speed.toFixed(3)} km/s`;
        }
      }
    }

    liveLoop = requestAnimationFrame(tick);
  };

  tick();
};
const stopLive = (): void => {
  if (liveLoop !== null) cancelAnimationFrame(liveLoop);

  liveLoop = null;
};
/** Makes an element with the `int` class, as everything in the HUD has. */
const make = <T extends HTMLElement = HTMLElement>(
  tag: string,
  text = '',
  className = '',
  id = ''
): T => {
  const element = document.createElement(tag) as T;

  element.className = `int${className ? ` ${className}` : ''}`;
  element.textContent = text;

  if (id) element.id = id;

  return element;
};
/** Makes a link, opening in the same tab, marked as leaving the site. */
const makeLink = (text: string, href: string): HTMLAnchorElement => {
  const link = make<HTMLAnchorElement>('a', text);
  const arrow = make('span', '↗', 'mc-external');

  link.href = href;
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow);

  return link;
};
/**
 * Shows the body's image (#126), with its caption and credit, or hides the
 * frame for a body without one. An artist's impression says so.
 */
const fillImage = (body: CelestialBodyType): void => {
  const figure = document.getElementById('focusImage');
  const img = document.getElementById(
    'focusImageImg'
  ) as HTMLImageElement | null;
  const title = document.getElementById('focusImageTitle');
  const credit = document.getElementById('focusImageCredit');
  const image = getBodyImage(body.id);

  if (!figure || !img || !title || !credit) return;

  figure.hidden = !image;

  if (!image) {
    img.removeAttribute('src');
    img.removeAttribute('srcset');

    return;
  }

  const { src, srcset } = getImageSources(body.id, import.meta.env.BASE_URL);
  const licenceUrl = LICENCE_URLS[image.licence];

  img.width = image.width;
  img.height = image.height;
  img.alt = image.alt;
  img.sizes = IMAGE_SIZES;
  img.srcset = srcset;
  img.src = src;
  title.textContent = image.impression
    ? `Artist's impression · ${image.title}`
    : image.title;
  credit.replaceChildren(
    `${getCreditText(image)} · `,
    licenceUrl ? makeLink(image.licence, licenceUrl) : image.licence,
    ' · ',
    makeLink('Source', image.source)
  );
};
/**
 * Puts the image where it belongs: top right, beside the map, in the map's
 * `<main>` (so it is in a landmark), or on a narrow screen in the info
 * sheet, under the body's name.
 */
const placeImage = (narrow: boolean): void => {
  const figure = document.getElementById('focusImage');
  const title = document.getElementById('focusTitle');

  if (!figure || !title) return;

  if (narrow) title.after(figure);
  else (document.querySelector('main') ?? document.body).append(figure);
};
/** Fills the focus panel with the body's designation, name, path and facts. */
const fillPanel = (body: CelestialBodyType): void => {
  const code = document.getElementById('focusCode');
  const kind = document.getElementById('focusKind');
  const title = document.getElementById('focusTitle');
  const path = document.getElementById('focusPath');
  const live = document.getElementById('focusLive');
  const rangeLabel = document.getElementById('focusRangeLabel');
  const facts = document.getElementById('focusFacts');
  const parent = findBodyById(body.parent);

  if (code) code.textContent = getDesignation(body);

  if (kind) {
    kind.textContent = BODY_KIND_LABELS[getBodyKind(body.id) ?? 'planet'];
  }

  if (title) title.textContent = body.name;

  if (path) {
    path.replaceChildren(...getPath(body).map((name) => make('span', name)));
  }

  if (live) live.hidden = !(body.orbit && parent);

  if (rangeLabel && parent) rangeLabel.textContent = `Range to ${parent.name}`;

  fillImage(body);

  if (!facts) return;

  const gauges = getGauges(body);

  facts.replaceChildren(
    ...getBodyFacts(body).map(([label, value], index) => {
      const row = make('div');
      const term = make('dt');
      const number = make('span', String(index + 1).padStart(2, '0'));

      number.classList.add('mc-focus-code');
      term.append(number, make('span', label));
      row.append(term, make('dd', value));

      if (label in gauges) {
        const gauge = make('span');

        gauge.classList.add('mc-gauge');
        gauge.setAttribute('aria-hidden', 'true');
        gauge.style.setProperty('--int-gauge', String(gauges[label]));
        row.append(gauge);
      }

      return row;
    })
  );
};

/**
 * Opens the focus view on a body: what clicking it does (locking is the
 * Lock menu's). Time holds, the camera centres on the body and zooms until
 * its disc covers about half the height (2/3 on a narrow screen), the HUD
 * panels slide out, and arrows and zooming are off. A panel describes the
 * body, a visor of tapes reads its bearing, range and speed, and the
 * minimap grows to show it in its system.
 *
 * @param {CelestialBodyType} body - The clicked body.
 *
 * @example
 * ```ts
 * openFocusView(earth);
 * ```
 */
export const openFocusView = (body: CelestialBodyType): void => {
  const panel = document.getElementById('focusView');
  const close = document.getElementById('focusClose');
  const select = document.getElementById('lockOn') as HTMLSelectElement | null;
  const info = document.getElementById(
    'bodyInfoOpen'
  ) as HTMLButtonElement | null;

  if (!panel || !close || globalThis.FOCUSED_CELESTIAL_BODY) return;

  returnFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  enableLayersFor(body);
  hideBodyInfo();
  // The focus view replaces any lock; closing it leaves the camera free
  updateLockStatus(null);

  if (select) select.value = 'noLock';

  if (info) info.disabled = true;

  // Time holds, so the body stays put while it is looked at
  wasPaused = globalThis.PAUSE;
  globalThis.PAUSE = true;
  updateSimulationStatus(true);
  fillPanel(body);
  panel.hidden = false;
  close.hidden = false;
  document.documentElement.classList.add('is-focus-view');

  const area = getClearArea();

  setShift({ x: area.x, y: area.y });
  globalThis.FOCUSED_CELESTIAL_BODY = body;
  globalThis.LOCKED_CELESTIAL_BODY = body;
  document.dispatchEvent(new Event(LOCK_CHANGE));
  startLive(body);
  animate(getFocusViewScale(body, area), null);
  close.focus({ preventScroll: true });
};

/**
 * Closes the focus view: the panels, arrows and zooming come back, time
 * runs again (unless it was held before), and the camera zooms out and pans
 * to the clicked body's parent (the Sun for Earth, Earth for the Moon),
 * close enough that the body is still in view. The camera is left free,
 * not locked.
 *
 * @example
 * ```ts
 * closeFocusView();
 * ```
 */
export const closeFocusView = (): void => {
  const body = globalThis.FOCUSED_CELESTIAL_BODY;

  if (!body) return;

  const panel = document.getElementById('focusView');
  const close = document.getElementById('focusClose');
  const canvas = getCanvas();
  const parent = findBodyById(body.parent);
  const startShift = getFocusShift();

  globalThis.FOCUSED_CELESTIAL_BODY = null;
  globalThis.LOCKED_CELESTIAL_BODY = null;
  globalThis.PAUSE = wasPaused;
  updateSimulationStatus(wasPaused);
  document.documentElement.classList.remove('is-focus-view');
  document.dispatchEvent(new Event(LOCK_CHANGE));

  if (panel) panel.hidden = true;

  if (close) close.hidden = true;

  const image = document.getElementById('focusImage');

  if (image) image.hidden = true;

  stopLive();
  returnFocus?.focus({ preventScroll: true });
  returnFocus = null;

  const finish = () => updateMinimap();

  if (!parent || !body.orbit || !canvas) {
    finish();

    return;
  }

  // Fit the body's distance from its parent in the space between the panels
  const left =
    (document.querySelector<HTMLElement>('.mc-left')?.offsetWidth ?? 0) + 24;
  const right =
    (document.querySelector<HTMLElement>('.int.controls')?.offsetWidth ?? 0) +
    24;
  const halfView = Math.max(
    80,
    Math.min(
      canvas.clientWidth / 2 - Math.max(left, right),
      canvas.clientHeight / 2
    )
  );
  const target = Math.min(
    SCALE.value,
    halfView / ((getOrbitState(body).range || 1e-6) * PARENT_MARGIN * AU_IN_PX)
  );

  animate(
    target,
    (scale, eased) => {
      const from = getCentreOffsets(body, scale);
      const to = getCentreOffsets(parent, scale);

      offsetX.value =
        from.x + startShift.x * (1 - eased) + (to.x - from.x) * eased;
      offsetY.value =
        from.y + startShift.y * (1 - eased) + (to.y - from.y) * eased;
    },
    finish
  );
};

/**
 * Keeps the body framed when the window resizes.
 *
 * @example
 * ```ts
 * globalThis.addEventListener('resize', refitFocusView);
 * ```
 */
export const refitFocusView = (): void => {
  const body = globalThis.FOCUSED_CELESTIAL_BODY;

  if (!body) return;

  const area = getClearArea();

  setShift({ x: area.x, y: area.y });
  SCALE.value = getFocusViewScale(body, area);
};

/** Leaves the controls out of the accessibility tree: they repeat the panel. */
const decorative = <T extends HTMLElement>(element: T): T => {
  element.setAttribute('aria-hidden', 'true');

  return element;
};
/**
 * Builds the focus view: the data column (designation, path, kind, name,
 * live readouts and facts), the body's image, the system map's caption, the
 * status strip (clock, Time held, Zoom locked) and Release target. Hidden
 * until a body is clicked.
 */
const createFocusView = (): void => {
  if (document.getElementById('focusView')) return;

  const panel = make('section', '', 'mc-focus', 'focusView');
  const bar = make('p', '', 'mc-focus-bar');
  const live = make('dl', '', 'mc-focus-live', 'focusLive');
  const reading = (id: string, label: string, labelId = '') => {
    const row = make('div');

    row.append(make('dt', label, '', labelId), make('dd', '', '', id));

    return row;
  };
  const caption = decorative(make('p', '', 'mc-focus-map-caption'));
  const status = decorative(make('p', '', 'mc-focus-status'));
  const flags = make('span', '', 'mc-focus-status-flags');
  const close = make<HTMLButtonElement>(
    'button',
    '',
    'mc-focus-close',
    'focusClose'
  );
  const image = make('figure', '', 'mc-focus-image', 'focusImage');
  const imageTitle = make('figcaption', '', 'mc-focus-image-title');
  const frame = make('span', '', 'mc-focus-image-frame');
  const img = make<HTMLImageElement>('img', '', '', 'focusImageImg');
  const narrow = globalThis.matchMedia(NARROW);

  panel.setAttribute('aria-labelledby', 'focusTitle');
  // A Tab stop, as a long list of facts scrolls, by keyboard too
  panel.tabIndex = 0;
  panel.hidden = true;
  bar.append(
    decorative(make('span', '', 'mc-focus-blink')),
    make('span', 'Target acquired'),
    make('b', '', '', 'focusCode')
  );
  live.append(
    reading('focusRange', 'Range', 'focusRangeLabel'),
    reading('focusBearing', 'Bearing'),
    reading('focusSpeed', 'Orbital speed')
  );
  panel.append(
    bar,
    make('p', '', 'mc-focus-path', 'focusPath'),
    make('p', '', 'mc-focus-kind', 'focusKind'),
    make('h2', 'Target', 'mc-focus-title', 'focusTitle'),
    live,
    make('dl', '', 'mc-focus-facts', 'focusFacts')
  );
  caption.append(make('span', 'NAV'), make('b', '', '', 'focusMapCaption'));
  flags.append(
    make('span', 'Time held', 'mc-focus-status-lock'),
    make('span', 'Zoom locked', 'mc-focus-status-lock')
  );
  status.append(make('span', '', '', 'focusClock'), flags);
  close.type = 'button';
  close.hidden = true;
  close.setAttribute('aria-controls', 'focusView');
  close.append(make('span', 'Release target'), make('kbd', 'Esc'));
  close.addEventListener('click', closeFocusView);
  image.hidden = true;
  imageTitle.append(
    decorative(make('span', 'VIS', 'mc-focus-image-chip')),
    make('span', '', '', 'focusImageTitle')
  );
  img.decoding = 'async';
  frame.append(img);
  image.append(
    imageTitle,
    frame,
    make('p', '', 'mc-focus-image-credit', 'focusImageCredit')
  );
  document.body.append(panel, caption, status, close, image);
  placeImage(narrow.matches);
  narrow.addEventListener('change', (event) => placeImage(event.matches));
};

createFocusView();
setFocusOverlay(drawFocusBody);
