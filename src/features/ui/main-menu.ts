/**
 * Opens and closes the header menu: Settings, then the links, in a dropdown
 * under the menu button at the top right, on every screen width.
 *
 * The button's `aria-expanded` shows the dropdown (see `.mc-menu` in
 * main.css). Escape closes it and returns focus to the button. Picking an
 * item, or clicking anywhere outside the menu, closes it too.
 *
 * @param {Document} [root=document] - The document holding the header.
 *
 * @example
 * ```ts
 * setupMainMenu();
 * ```
 */
export const setupMainMenu = (root: Document = document): void => {
  const button = root.getElementById('menuToggle');
  const nav = button?.closest('nav');

  if (!button || !nav) return;

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const setOpen = (open: boolean) =>
    button.setAttribute('aria-expanded', String(open));

  button.addEventListener('click', () => setOpen(!isOpen()));

  nav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });

  nav.addEventListener('click', ({ target }) => {
    if ((target as Element).closest('li a, li button')) setOpen(false);
  });

  root.addEventListener('click', (event) => {
    if (isOpen() && !nav.contains(event.target as Node)) setOpen(false);
  });
};
