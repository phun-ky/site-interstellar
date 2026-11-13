/**
 * Shows whether the simulation runs or holds: the status in the header
 * (`● nominal` / `◌ hold`) and the labels of the hold buttons.
 *
 * @param {boolean} paused - Whether the simulation is paused.
 *
 * @example
 * ```ts
 * updateSimulationStatus(true); // header shows "◌ hold", the button "Resume"
 * ```
 */
export const updateSimulationStatus = (paused: boolean): void => {
  const statusElement = document.getElementById('simStatus');
  // The Systems panel's button, and the bottom bar's on narrow screens
  const pauseButtonElements = document.querySelectorAll('#pause, #pauseDock');

  if (statusElement) {
    statusElement.textContent = paused ? '◌ hold' : '● nominal';
    statusElement.classList.toggle('is-hold', paused);
  }

  pauseButtonElements.forEach((button) => {
    button.textContent = paused ? 'Resume' : 'Hold';
    button.setAttribute('aria-pressed', String(paused));
  });
};

/**
 * Shows which body the camera is locked on in the header (`// Lock: Earth`),
 * or hides it when nothing is locked. The minimap stays, showing what is
 * around the locked body (#117).
 *
 * @param {string | null} name - The locked body's name, or `null` for no lock.
 *
 * @example
 * ```ts
 * updateLockStatus('Earth');
 * updateLockStatus(null);
 * ```
 */
export const updateLockStatus = (name: string | null): void => {
  const lockElement = document.getElementById('lockStatus');
  const nameElement = document.getElementById('lockStatusName');

  if (!lockElement || !nameElement) return;

  nameElement.textContent = name ?? '';
  lockElement.hidden = name === null;
};
