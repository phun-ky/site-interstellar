import { CelestialBodyType } from '@interstellar-tools/types';

import { MAX_SCALE, MIN_SCALE, SCALE, ZOOM_FACTOR } from '../config/constants';
import { setUIOptions } from '../config/set-UI-options';
import { offsetX, offsetY } from '../features/canvas/config/camera';
import {
  centreLocked,
  isOffCentre,
  panLocked,
  zoomLockPan
} from '../features/canvas/config/camera/lock-pan';
import { OPTIONS_UI } from '../features/canvas/config/hud';
import { SPEED_MODE } from '../features/canvas/config/time-step';
import { getViewportSize } from '../features/canvas/get-viewport-size';
import { setupCanvas } from '../features/canvas/setup-canvas';
import {
  findBodyById,
  getBodyKind
} from '../features/celestial-bodies/utils/body-catalog';
import { getBodyPosition } from '../features/celestial-bodies/utils/get-body-position';
import { playZoomTick } from '../features/sound/sound';
import {
  moveStarfield,
  zoomStarfield
} from '../features/starfield/starfield-motion';
import { closeBodyInfo, toggleLockedBodyInfo } from '../features/ui/body-info';
import { isFocusView, loadFocusView } from '../features/ui/focus-state';
import {
  focusOn,
  getBodyAtPoint,
  lockOn,
  showLockedMoons
} from '../features/ui/lock-on';
import { resetToNow } from '../features/ui/reset-to-now';
import { updateScaleDisplay } from '../features/ui/update-scale-display';
import { updateSimulationStatus } from '../features/ui/update-simulation-status';

import { distanceToPixels } from './distance/distance-to-pixels';
import { getParentBodyOffset } from './offset/get-parent-body-offset';
import { normalizeParentOffsetPrev } from './offset/normalize-parent-offset-prev';
import { calculateScale } from './scale/calculate-scale';
import { getPinchScale, getZoomOffset } from './scale/zoom-at';
import { throttle } from './throttle';

/** How far the pointer may move between press and release for a click, in pixels. */
const CLICK_TOLERANCE_PX = 5;
/** Whether a key goes into a field, where it is text rather than a shortcut. */
const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

let isDragging = false;
// Whether the user held the simulation, so showing the tab again doesn't resume it
let isHeldByUser = false;
let lastMouseX: number;
let lastMouseY: number;

export type AttachEventHandlersPropsType = {
  space: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
};

const scaleDisplay = document.getElementById('scaleDisplay') as HTMLElement;

export const attachEventHandlers = (props: AttachEventHandlersPropsType) => {
  const { canvas } = props;
  /**
   * Zooms to `newScale` around a point on the screen (the wheel's pointer, or
   * the middle of a pinch). While locked, the locked body stays centred.
   */
  const zoomAround = (newScale: number, clientX: number, clientY: number) => {
    // Zooming is off in the focus view
    if (isFocusView()) return;

    if (newScale < MIN_SCALE || newScale > MAX_SCALE) return;

    const prevScale = { value: SCALE.value };

    SCALE.value = newScale;
    playZoomTick(newScale > prevScale.value);
    // The starfield's layers zoom a little with the map
    zoomStarfield(newScale / prevScale.value);

    document.dispatchEvent(
      new CustomEvent('ZoomChanged', { detail: { SCALE } })
    );

    if (globalThis.LOCKED_CELESTIAL_BODY) {
      // Panned away from the locked body, the point under the pointer stays
      // put; centred, the body stays in the middle (#118). The canvas is
      // only measured then, as measuring makes the browser lay out the page
      if (isOffCentre()) {
        const { left, top } = canvas.getBoundingClientRect();
        const { width, height } = getViewportSize(canvas);

        zoomLockPan(
          SCALE.value / prevScale.value,
          clientX - left - width / 2,
          clientY - top - height / 2
        );
      }

      // The locked body's position in pixels, before and after
      const { x, y } = getBodyPosition(globalThis.LOCKED_CELESTIAL_BODY);

      if (!x || !y) return;

      const { parentOffsetX, parentOffsetY } = getParentBodyOffset(
        globalThis.LOCKED_CELESTIAL_BODY.parent,
        SCALE
      );
      const prevX = distanceToPixels(x, prevScale);
      const prevY = distanceToPixels(y, prevScale);
      const newX = distanceToPixels(x, SCALE);
      const newY = distanceToPixels(y, SCALE);

      offsetX.value += normalizeParentOffsetPrev(parentOffsetX, prevX, newX);
      offsetY.value += normalizeParentOffsetPrev(parentOffsetY, prevY, newY);
    } else {
      // The point relative to the canvas, which starts below the header
      const { left, top } = canvas.getBoundingClientRect();
      const { width, height } = getViewportSize(canvas);

      offsetX.value = getZoomOffset(
        offsetX.value,
        clientX - left,
        width / 2,
        prevScale.value,
        SCALE.value
      );
      offsetY.value = getZoomOffset(
        offsetY.value,
        clientY - top,
        height / 2,
        prevScale.value,
        SCALE.value
      );
    }

    updateScaleDisplay(scaleDisplay, SCALE);
  };

  // **Smooth Zooming**
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomAround(calculateScale(event, SCALE), event.clientX, event.clientY);
  });

  // **Panning and pinching**, with a mouse, a finger or a pen. One pointer
  // pans; two pinch to zoom around their middle, and pan with it. While a
  // body is locked, panning moves the view off it and the camera keeps
  // following it (#118); the focus view keeps it where it is
  const pointers = new Map<number, { x: number; y: number }>();

  let pinch: { distance: number; scale: number } | null = null;

  const isLocked = () => Boolean(globalThis.LOCKED_CELESTIAL_BODY);
  const pinchGeometry = () => {
    const [a, b] = [...pointers.values()];

    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  };
  const startMoving = () => {
    globalThis.IS_ZOOMING_OR_PANNING = true;

    if (globalThis.ZOOM_PAN_TIMEOUT) clearTimeout(globalThis.ZOOM_PAN_TIMEOUT);
  };
  const stopMoving = () => {
    globalThis.ZOOM_PAN_TIMEOUT = window.setTimeout(() => {
      globalThis.IS_ZOOMING_OR_PANNING = false; // Re-enable trails after panning stops
    }, 500);
  };

  canvas.addEventListener('pointerdown', (event) => {
    // The main mouse button only; any finger or pen
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    // Keeps the gesture going when it leaves the canvas
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startMoving();

    if (pointers.size === 2) {
      const { distance, x, y } = pinchGeometry();

      pinch = { distance, scale: SCALE.value };
      lastMouseX = x;
      lastMouseY = y;
      isDragging = !isFocusView();
    } else if (pointers.size === 1) {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      isDragging = !isFocusView();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // The middle of a pinch moves like a single pointer
    const { x, y } =
      pinch && pointers.size === 2
        ? pinchGeometry()
        : { x: event.clientX, y: event.clientY };

    if (pinch && pointers.size === 2) {
      zoomAround(
        getPinchScale(pinch.scale, pinch.distance, pinchGeometry().distance),
        x,
        y
      );
    }

    if (isDragging && isLocked()) {
      panLocked(x - lastMouseX, y - lastMouseY);
    } else if (isDragging) {
      offsetX.value += x - lastMouseX;
      offsetY.value += y - lastMouseY;
    }

    // The starfield's layers drift a little with the map
    if (isDragging) moveStarfield(x - lastMouseX, y - lastMouseY);

    lastMouseX = x;
    lastMouseY = y;
  });

  const endPointer = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;

    if (pointers.size < 2) pinch = null;

    if (pointers.size === 1) {
      // Carry on panning with the finger still down, without a jump
      const [rest] = [...pointers.values()];

      lastMouseX = rest.x;
      lastMouseY = rest.y;
    } else if (pointers.size === 0) {
      isDragging = false;
      stopMoving();
    }
  };

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // The minimap follows the zoom from the animation loop (see App.ts)
  document.addEventListener('ZoomChanged', () => {
    globalThis.IS_ZOOMING_OR_PANNING = true;

    if (globalThis.ZOOM_PAN_TIMEOUT) clearTimeout(globalThis.ZOOM_PAN_TIMEOUT); // Reset timer

    globalThis.ZOOM_PAN_TIMEOUT = window.setTimeout(() => {
      globalThis.IS_ZOOMING_OR_PANNING = false; // Re-enable trails after zooming stops
    }, 500);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      globalThis.PAUSE = true; // Pause simulation when tab is hidden
    } else if (!isHeldByUser && !isFocusView()) {
      globalThis.PAUSE = false; // Resume simulation when tab is visible
    }
  });

  // **Resize Event**
  globalThis.addEventListener(
    'resize',
    throttle(() => {
      globalThis.IS_ZOOMING_OR_PANNING = true;

      if (globalThis.ZOOM_PAN_TIMEOUT)
        clearTimeout(globalThis.ZOOM_PAN_TIMEOUT); // Reset timer

      setupCanvas();

      if (isFocusView()) {
        loadFocusView().then(({ refitFocusView }) => refitFocusView());
      }
    })
  );

  document.addEventListener('keydown', (event) => {
    // C puts the locked body back in the middle, unless typing in a field
    if (
      event.key.toLowerCase() === 'c' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !isTyping(event.target) &&
      isLocked() &&
      !isFocusView() &&
      isOffCentre()
    ) {
      centreLocked(true);
    }

    if (event.key === 'Escape') {
      if (isFocusView()) {
        loadFocusView().then(({ closeFocusView }) => closeFocusView());
      } else {
        closeBodyInfo();
      }
    }

    if ((event.ctrlKey || event.metaKey) && !isFocusView()) {
      // Ctrl on Windows/Linux, Cmd on macOS
      if (event.key === '=' || event.key === '+') {
        // Ctrl +
        event.preventDefault();
        zoomIn();
      } else if (event.key === '-') {
        // Ctrl -
        event.preventDefault();
        zoomOut();
      }
    }
  });

  const zoomIn = () => {
    const zoomEvent = new CustomEvent('ZoomChanged', { detail: { SCALE } });

    document.dispatchEvent(zoomEvent);
    SCALE.value *= ZOOM_FACTOR;
    // Round the middle of the map, panned off a locked body or not
    zoomLockPan(ZOOM_FACTOR, 0, 0);
    playZoomTick(true);
  };
  const zoomOut = () => {
    const zoomEvent = new CustomEvent('ZoomChanged', { detail: { SCALE } });

    document.dispatchEvent(zoomEvent);
    SCALE.value /= ZOOM_FACTOR;
    zoomLockPan(1 / ZOOM_FACTOR, 0, 0);
    playZoomTick(false);
  };
  const trajectoryTypeDropdown = document.getElementById(
    'toggleTrajectoryType'
  ) as HTMLSelectElement;

  trajectoryTypeDropdown.addEventListener('change', () => {
    globalThis.TRAJECTORY_TYPE = trajectoryTypeDropdown.value as
      'orbits' | 'trails';

    if (globalThis.TRAJECTORY_TYPE === 'orbits') {
      Object.keys(globalThis.TRAJECTORY_TRAILS).forEach((key) => {
        globalThis.TRAJECTORY_TRAILS[key] = []; // Clear stored trail data
      });
    }
  });

  const pauseButtonElement = document.getElementById(
    'pause'
  ) as HTMLButtonElement;

  pauseButtonElement.addEventListener('click', () => {
    globalThis.PAUSE = !globalThis.PAUSE;
    isHeldByUser = globalThis.PAUSE;
    updateSimulationStatus(globalThis.PAUSE);

    // The animation loop keeps running while held, so it isn't restarted here
    if (!globalThis.PAUSE) {
      globalThis.INTERVAL_IN_VIEWPORT.resume();
    } else {
      globalThis.INTERVAL_IN_VIEWPORT.pause();
    }
  });

  document
    .getElementById('resetToNow')
    ?.addEventListener('click', () => resetToNow());

  const lockOnDropdown = document.getElementById('lockOn') as HTMLSelectElement;

  lockOnDropdown.addEventListener('change', () => {
    const value = lockOnDropdown.value;
    const body = findBodyById(value);

    if (value === 'noLock' || !body || getBodyKind(body.id) === 'system') {
      lockOn(null);
    } else {
      focusOn(body as CelestialBodyType);
    }
  });

  // **Click a body to lock on it**, unless the pointer moved (a drag)
  let pointerDownAt: { x: number; y: number } | null = null;

  canvas.addEventListener('pointerdown', (event) => {
    pointerDownAt = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener('click', (event) => {
    if (
      pointerDownAt &&
      Math.hypot(
        event.clientX - pointerDownAt.x,
        event.clientY - pointerDownAt.y
      ) > CLICK_TOLERANCE_PX
    ) {
      return;
    }

    // Clicking opens the focus view; locking is the Lock menu's
    if (isFocusView()) return;

    const body = getBodyAtPoint(canvas, event.clientX, event.clientY);

    // The view loads on the first click, as a file of its own
    if (body) loadFocusView().then(({ openFocusView }) => openFocusView(body));
  });

  // Show a pointer over bodies, checked at most once per frame
  let hoverCheck: number | null = null;

  canvas.addEventListener('mousemove', (event) => {
    if (hoverCheck !== null) return;

    hoverCheck = requestAnimationFrame(() => {
      hoverCheck = null;
      canvas.style.cursor =
        !isFocusView() && getBodyAtPoint(canvas, event.clientX, event.clientY)
          ? 'pointer'
          : '';
    });
  });

  document
    .getElementById('bodyInfoClose')
    ?.addEventListener('click', closeBodyInfo);
  document
    .getElementById('bodyInfoOpen')
    ?.addEventListener('click', toggleLockedBodyInfo);

  const trajectoryCheckboxElement = document.getElementById(
    'toggleTrajectory'
  ) as HTMLInputElement;
  const moonsCheckboxElement = document.getElementById(
    'toggleMoons'
  ) as HTMLInputElement;
  const cometsCheckboxElement = document.getElementById(
    'toggleComets'
  ) as HTMLInputElement;
  const interstellarCheckboxElement = document.getElementById(
    'toggleInterstellar'
  ) as HTMLInputElement;
  const labelCheckboxElement = document.getElementById(
    'toggleLabels'
  ) as HTMLInputElement;
  const toggleArrowheadsElement = document.getElementById(
    'toggleArrowheads'
  ) as HTMLInputElement;
  const asteroidBeltsCheckboxElement = document.getElementById(
    'toggleAsteroidBelts'
  ) as HTMLInputElement;
  const asteroidsCheckboxElement = document.getElementById(
    'toggleAsteroids'
  ) as HTMLInputElement;
  const starfieldCheckboxElement = document.getElementById(
    'toggleStarfield'
  ) as HTMLInputElement;

  [
    trajectoryCheckboxElement,
    moonsCheckboxElement,
    cometsCheckboxElement,
    interstellarCheckboxElement,
    labelCheckboxElement,
    toggleArrowheadsElement,
    asteroidBeltsCheckboxElement,
    asteroidsCheckboxElement,
    starfieldCheckboxElement
  ].forEach((toggle) => {
    toggle.addEventListener('change', () => {
      setUIOptions({
        trajectoryCheckboxElement,
        moonsCheckboxElement,
        cometsCheckboxElement,
        interstellarCheckboxElement,
        labelCheckboxElement,
        toggleArrowheadsElement,
        asteroidBeltsCheckboxElement,
        asteroidsCheckboxElement,
        starfieldCheckboxElement
      });
    });
  });

  // After the options above are set, so the zoom counts the moons
  moonsCheckboxElement.addEventListener('change', () => {
    if (moonsCheckboxElement.checked) showLockedMoons();
  });

  const arrowCountElement = document.getElementById(
    'arrowCount'
  ) as HTMLSelectElement;

  arrowCountElement.addEventListener('change', () => {
    OPTIONS_UI.arrowHeadsCount = Number(arrowCountElement.value);
  });

  const speedModeElement = document.getElementById(
    'speedMode'
  ) as HTMLSelectElement;

  speedModeElement.addEventListener('change', () => {
    const mode = speedModeElement.value;
    const speedModeEvent = new CustomEvent('SpeedModeChanged', {
      detail: { mode }
    });

    document.dispatchEvent(speedModeEvent);
  });

  document.addEventListener('SpeedModeChanged', (event: Event) => {
    const { mode } = (event as CustomEvent).detail;

    SPEED_MODE.value = mode;
  });
};
