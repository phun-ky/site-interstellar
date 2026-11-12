import {
  centreLocked,
  isOffCentre,
  LOCK_PAN_CHANGE
} from '../canvas/config/camera/lock-pan';

import { LOCK_CHANGE } from './lock-on';

/**
 * Sets up Centre (#118), which puts the locked body back in the middle after
 * the view has been panned off it:
 *
 * - **Centre** beside Lock and Info, disabled (but still focusable) while
 *   the body is in the middle or nothing is locked.
 * - **Centre on …** on the map, above the views console, shown only while
 *   the view is off the body.
 *
 * The C key does the same (see `attachEventHandlers`).
 *
 * @example
 * ```ts
 * setupLockCentre();
 * ```
 */
export const setupLockCentre = (): void => {
  const panel = document.getElementById('lockCentre');
  const map = document.getElementById('mapCentre');
  const name = document.getElementById('mapCentreName');
  const update = () => {
    const off = Boolean(globalThis.LOCKED_CELESTIAL_BODY) && isOffCentre();

    panel?.setAttribute('aria-disabled', String(!off));

    if (name) name.textContent = globalThis.LOCKED_CELESTIAL_BODY?.name ?? '';

    if (!map) return;

    // Going, with focus on it: keep focus on the Centre that stays
    if (!off && document.activeElement === map && panel?.offsetParent) {
      panel.focus();
    }

    map.hidden = !off;
  };
  const centre = () => {
    if (isOffCentre()) centreLocked(true);
  };

  panel?.addEventListener('click', centre);
  map?.addEventListener('click', centre);
  document.addEventListener(LOCK_PAN_CHANGE, update);
  document.addEventListener(LOCK_CHANGE, update);
  update();
};
