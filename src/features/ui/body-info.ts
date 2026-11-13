import {
  CelestialBodyType,
  InterstellarObjectInterface
} from '@interstellar-tools/types';

import {
  BODY_KIND_LABELS,
  findBodyById,
  getBodyKind,
  getChildBodies
} from '../celestial-bodies/utils/body-catalog';
import { type GalaxyBodyType } from '../celestial-bodies/utils/galaxy-bodies';
import { isOpenOrbit } from '../celestial-bodies/utils/orbit-orientation';

import { formatDistance, formatNumber, formatPeriod } from './utils/format';
import {
  getDiscoveryFacts,
  getRingFacts,
  getRotationFacts,
  getStarFacts,
  getTypeLabel
} from './utils/observed-facts';

const html = String.raw;

/** What the info popup can describe: a body, an interstellar object or a galaxy. */
type InfoBodyType =
  CelestialBodyType | InterstellarObjectInterface | GalaxyBodyType;

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
export const getBodyFacts = (
  body: InfoBodyType
): [label: string, value: string][] => {
  // A galaxy has no orbit: where it is, and how big
  if (body.category === 'galaxy') {
    return [
      ['Type', body.type],
      ['Distance', formatDistance(body.distance)],
      [
        'Diameter',
        formatDistance({ ...body.radius, value: body.radius.value * 2 })
      ]
    ];
  }

  const { type, category, parent, radius, orbit } = body;
  const parentName =
    findBodyById(parent)?.name ??
    (parent === 'milky-way' ? 'Milky Way' : (parent ?? 'Unknown'));
  const moons = getChildBodies(body.id).filter(
    (child) => getBodyKind(child.id) === 'moon'
  ).length;
  const facts: [string, string][] = [
    [getTypeLabel(body), capitalize(type ?? category)],
    ['Orbits', parentName],
    ['Radius', formatDistance(radius)],
    // A star's mass, and what is measured about it
    ...getStarFacts(body),
    ...getRotationFacts(body)
  ];

  if (orbit && isOpenOrbit(orbit)) {
    // An open orbit has no size or period, but a closest pass and a speed
    facts.push(
      ['Perihelion', formatDistance(orbit.q)],
      ['Eccentricity', orbit.e.toFixed(4)],
      [
        'Excess speed',
        `${formatNumber(orbit.excessSpeed)} km/s${orbit.retrograde ? ' · retrograde' : ''}`
      ]
    );
  } else if (orbit) {
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

  facts.push(...getRingFacts(body), ...getDiscoveryFacts(body));

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
export const showBodyInfo = (body: InfoBodyType): void => {
  const panel = document.getElementById('bodyInfo');
  const title = document.getElementById('bodyInfoTitle');
  const kind = document.getElementById('bodyInfoKind');
  const facts = document.getElementById('bodyInfoFacts');

  if (!panel || !title || !kind || !facts) return;

  const kindLabel = BODY_KIND_LABELS[getBodyKind(body.id) ?? 'planet'];

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
