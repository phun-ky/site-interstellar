import { ToggleBox } from '../../components/ToggleBox';
import { SOUND_SETTINGS } from '../sound/sound';

/**
 * Sets up the Settings dialog, opened from Settings in the header menu.
 *
 * The dialog is modal: the map behind it can't be reached until it closes.
 * It holds a switch for each sound (see `setupSound`), all off on every
 * visit. Escape, its close button or a click outside it closes it, and focus
 * returns to the menu button, since the menu has closed behind it.
 *
 * @param {Document} [root=document] - The document holding the dialog.
 *
 * @example
 * ```ts
 * setupSettings();
 * ```
 */
export const setupSettings = (root: Document = document): void => {
  const dialog = root.getElementById('settings');
  const sounds = root.getElementById('soundSettings');

  if (!(dialog instanceof HTMLDialogElement) || !sounds) return;

  sounds.insertAdjacentHTML(
    'beforeend',
    SOUND_SETTINGS.map(({ id, label }) =>
      ToggleBox({ id, name: id, label })
    ).join('')
  );

  root
    .getElementById('settingsOpen')
    ?.addEventListener('click', () => dialog.showModal());
  root
    .getElementById('settingsClose')
    ?.addEventListener('click', () => dialog.close());

  // The backdrop is part of the dialog: a click on it lands on the dialog itself
  dialog.addEventListener('click', ({ target }) => {
    if (target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () =>
    root.getElementById('menuToggle')?.focus()
  );
};
