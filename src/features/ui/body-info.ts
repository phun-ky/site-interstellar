import { convertTemporalUnit } from '@interstellar-tools/temporal';
import {
  CelestialBodyType,
  DistanceInterface,
  TemporalInterface
} from '@interstellar-tools/types';

import {
  findBodyById,
  getBodyKind,
  getChildBodies
} from '../celestial-bodies/utils/body-catalog';

const html = String.raw;
const NUMBER = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 });
const COMPACT = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumSignificantDigits: 3
});
const KIND_LABELS = {
  system: 'System',
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  comet: 'Comet',
  asteroid: 'Asteroid'
} as const;
const escapeHTML = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character] ?? character
  );
const formatNumber = (value: number): string =>
  Math.abs(value) >= 1e5 ? COMPACT.format(value) : NUMBER.format(value);
const formatDistance = ({ value, unit }: DistanceInterface): string =>
  `${formatNumber(value)} ${unit}`;
const formatPeriod = (period: TemporalInterface): string => {
  const days = convertTemporalUnit(period, 'd').value;

  if (days < 1000) return `${formatNumber(days)} d`;

  return `${formatNumber(convertTemporalUnit(period, 'yr').value)} yr`;
};
const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);
/**
 * Lists the facts shown for a body: type, what it orbits, radius, orbit size,
 * eccentricity, period and, for planets, how many moons it has.
 *
 * @param {CelestialBodyType} body - The body to describe.
 * @returns {[label: string, value: string][]} Label and value pairs, in display order.
 *
 * @example
 * ```ts
 * getBodyFacts(earth); // [['Type', 'Terrestrial planet'], ['Orbits', 'Sun'], …]
 * ```
 */
const getBodyFacts = (
  body: CelestialBodyType
): [label: string, value: string][] => {
  const { type, category, parent, radius, orbit } = body;
  const parentName =
    findBodyById(parent)?.name ??
    (parent === 'milky-way' ? 'Milky Way' : (parent ?? 'Unknown'));
  const moons = getChildBodies(body.id).filter(
    (child) => getBodyKind(child.id) === 'moon'
  ).length;
  const facts: [string, string][] = [
    ['Type', capitalize(type ?? category)],
    ['Orbits', parentName],
    ['Radius', formatDistance(radius)]
  ];

  if (orbit) {
    facts.push(
      ['Semi-major axis', formatDistance(orbit.a)],
      ['Eccentricity', orbit.e.toFixed(4)],
      [
        'Period',
        `${formatPeriod(orbit.period)}${orbit.retrograde ? ' · retrograde' : ''}`
      ]
    );
  }

  if (moons > 0) facts.push(['Moons', String(moons)]);

  return facts;
};
/** Shows on the Info button whether the popup is open. */
const setExpanded = (open: boolean): void =>
  document
    .getElementById('bodyInfoOpen')
    ?.setAttribute('aria-expanded', String(open));

/**
 * Opens the info popup for a body, docked at the bottom of the viewport so it
 * stays clear of the locked body in the middle.
 *
 * @param {CelestialBodyType} body - The body to show.
 *
 * @example
 * ```ts
 * showBodyInfo(earth);
 * ```
 */
export const showBodyInfo = (body: CelestialBodyType): void => {
  const panel = document.getElementById('bodyInfo');
  const title = document.getElementById('bodyInfoTitle');
  const kind = document.getElementById('bodyInfoKind');
  const facts = document.getElementById('bodyInfoFacts');

  if (!panel || !title || !kind || !facts) return;

  const kindLabel = KIND_LABELS[getBodyKind(body.id) ?? 'planet'];

  title.textContent = body.name;
  kind.textContent = kindLabel;
  facts.innerHTML = getBodyFacts(body)
    .map(
      ([label, value]) =>
        html`<div class="int">
          <dt class="int">${escapeHTML(label)}</dt>
          <dd class="int">${escapeHTML(value)}</dd>
        </div>`
    )
    .join('');
  panel.hidden = false;
  setExpanded(true);
};

/**
 * Closes the info popup.
 *
 * @example
 * ```ts
 * hideBodyInfo();
 * ```
 */
export const hideBodyInfo = (): void => {
  const panel = document.getElementById('bodyInfo');

  if (panel) panel.hidden = true;

  setExpanded(false);
};

/**
 * Closes the info popup as someone asked to, with Escape or its Close button.
 * When focus was in the popup, it returns to the Info button, or to the
 * Systems button while the Systems sheet, and the Info button in it, is closed
 * on a narrow screen.
 *
 * @example
 * ```ts
 * closeBodyInfo();
 * ```
 */
export const closeBodyInfo = (): void => {
  const panel = document.getElementById('bodyInfo');
  const hadFocus = !!panel?.contains(document.activeElement);

  hideBodyInfo();

  if (!hadFocus) return;

  const info = document.getElementById('bodyInfoOpen');

  (info?.getClientRects().length
    ? info
    : document.getElementById('systemsToggle')
  )?.focus();
};

/**
 * Opens the info popup for the locked body and moves focus to it, or closes
 * it when it is open: what the Info button by the Lock menu does, so the
 * popup can be opened without clicking a body. On a narrow screen the Systems
 * sheet closes first, since it would cover the popup.
 *
 * @example
 * ```ts
 * infoButton.addEventListener('click', toggleLockedBodyInfo);
 * ```
 */
export const toggleLockedBodyInfo = (): void => {
  const panel = document.getElementById('bodyInfo');
  const locked = globalThis.LOCKED_CELESTIAL_BODY;

  if (!panel || !locked) return;

  if (!panel.hidden) {
    hideBodyInfo();

    return;
  }

  if (document.getElementById('systems')?.classList.contains('is-open')) {
    document.getElementById('systemsToggle')?.click();
  }

  showBodyInfo(locked);
  panel.focus();
};
