import { CelestialBodyType } from '@interstellar-tools/types';

import { findBodyById } from '../celestial-bodies/utils/body-catalog';

// Types only: the drawer itself is loaded on the first click on Bodies
import type { SetBodiesOpenType } from './bodies-drawer';
import { focusOn, LOCK_CHANGE, showGalaxy } from './lock-on';

/**
 * Sets up the views console at the bottom of the map (#14):
 *
 * - **Solar system** locks on the Sun, framing its planets.
 * - **Galaxy** shows the whole Milky Way, as the map opens.
 * - **Bodies** opens a drawer with every body in a table (see
 *   `createBodiesDrawer`), loaded on the first click so the map page doesn't
 *   load it up front.
 *
 * Solar system shows as pressed while the Sun is locked, Galaxy while
 * nothing is. Either closes the drawer.
 *
 * @example
 * ```ts
 * setupViews();
 * ```
 */
export const setupViews = (): void => {
  const solar = document.getElementById('viewSolarSystem');
  const galaxy = document.getElementById('viewGalaxy');
  const toggle = document.getElementById('viewBodies');

  if (!solar || !galaxy || !toggle) return;

  let setOpen: SetBodiesOpenType | null = null;
  let loading: Promise<SetBodiesOpenType> | null = null;

  const getDrawer = (): Promise<SetBodiesOpenType> => {
    loading ??= import('./bodies-drawer').then(({ createBodiesDrawer }) => {
      setOpen = createBodiesDrawer(toggle);

      return setOpen;
    });

    return loading;
  };

  toggle.addEventListener('click', async () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';

    (await getDrawer())(open);
  });
  solar.addEventListener('click', () => {
    const sun = findBodyById('sun');

    setOpen?.(false);

    if (sun) focusOn(sun as CelestialBodyType);
  });
  galaxy.addEventListener('click', () => {
    setOpen?.(false);
    showGalaxy();
  });
  // Pressed: Solar system while the Sun is locked, Galaxy while nothing is
  document.addEventListener(LOCK_CHANGE, () => {
    const locked = globalThis.LOCKED_CELESTIAL_BODY;

    solar.setAttribute('aria-pressed', String(locked?.id === 'sun'));
    galaxy.setAttribute('aria-pressed', String(!locked));
  });
};
