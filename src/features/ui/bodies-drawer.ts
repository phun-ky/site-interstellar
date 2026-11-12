import {
  ASTEROIDS,
  COMETS,
  INTERSTELLAR_OBJECTS,
  MOONS,
  PLANETS,
  STARS
} from '@interstellar-tools/constants';
import { CelestialBodyType } from '@interstellar-tools/types';

import '../../styles/bodies.css';
import {
  type BodyKindType,
  findBodyById,
  GALAXY_BODIES
} from '../celestial-bodies/utils/body-catalog';

import { hideBodyInfo } from './body-info';
import { focusOn } from './lock-on';
import {
  type BodyRowType,
  type BodySortKeyType,
  countByKind,
  filterRows,
  getBodyRows,
  LISTED_KINDS,
  sortRows
} from './utils/body-rows';
import { formatAu, formatNumber, formatPeriod } from './utils/format';

/** The table's columns: what each sorts by, its heading, and, for a symbol, what it stands for. */
const COLUMNS: [BodySortKeyType, string, string?][] = [
  ['name', 'Name'],
  ['type', 'Type'],
  ['orbits', 'Orbits'],
  ['a', 'a', 'Semi-major axis'],
  ['e', 'e', 'Eccentricity'],
  ['period', 'Period']
];
/** What the kind filters are called. */
const KIND_FILTERS: Record<BodyKindType | 'all', string> = {
  all: 'All',
  system: 'Systems',
  star: 'Stars',
  planet: 'Planets',
  moon: 'Moons',
  asteroid: 'Asteroids',
  comet: 'Comets',
  interstellar: 'Interstellar',
  galaxy: 'Galaxies'
};
const NONE = '-';
/** Makes an element with the `int` class, as everything in the HUD has. */
const make = <T extends HTMLElement = HTMLElement>(
  tag: string,
  text = '',
  className = ''
): T => {
  const element = document.createElement(tag) as T;

  element.className = `int${className ? ` ${className}` : ''}`;
  element.textContent = text;

  return element;
};
/** A table row for a body, with a button that locks on it. */
const makeRow = (row: BodyRowType): HTMLTableRowElement => {
  const tr = make<HTMLTableRowElement>('tr');
  const name = make<HTMLTableCellElement>('th', row.name);
  const lock = make<HTMLButtonElement>('button', 'Lock', 'mc-bodies-lock');
  const cell = make('td');

  name.scope = 'row';
  lock.type = 'button';
  lock.dataset.id = row.id;
  lock.setAttribute('aria-label', `Lock on ${row.name}`);
  cell.append(lock);
  tr.append(
    name,
    make('td', row.type),
    make('td', row.orbits || NONE),
    make('td', row.a === null ? NONE : formatAu(row.a)),
    make('td', row.e === null ? NONE : formatNumber(row.e)),
    make(
      'td',
      row.period === null
        ? NONE
        : formatPeriod({ value: row.period, unit: 'd' })
    ),
    cell
  );

  return tr;
};

/** Opens or closes the drawer. */
export type SetBodiesOpenType = (open: boolean) => void;

/**
 * Builds the Bodies drawer above the views console (#14) and wires it up:
 * every body in a table, searchable by name, filtered by kind, sorted by any
 * column, with a Lock button on each row that locks on the body and closes
 * the drawer. Escape or its close button close it, returning focus to the
 * Bodies button, as does opening the Systems sheet on a narrow screen.
 *
 * Loaded on the first click on Bodies, so the map page doesn't load the
 * table, its data and its styles up front.
 *
 * @param {HTMLElement} toggle - The Bodies button, which opens and closes it.
 * @returns {SetBodiesOpenType} Opens or closes the drawer.
 *
 * @example
 * ```ts
 * const setOpen = createBodiesDrawer(bodiesButton);
 * setOpen(true);
 * ```
 */
export const createBodiesDrawer = (toggle: HTMLElement): SetBodiesOpenType => {
  const drawer = make('section', '', 'mc-panel mc-bodies');
  const top = make('div', '', 'mc-popup-head');
  const title = make('h2', '', 'mc-ptitle');
  const count = make('b');
  const close = make<HTMLButtonElement>('button', '×', 'mc-popup-close');
  const search = make<HTMLInputElement>('input', '', 'mc-bodies-search');
  const kinds = make('div', '', 'mc-bodies-kinds');
  const scroll = make('div', '', 'mc-bodies-scroll');
  const table = make('table', '', 'mc-bodies-table');
  const head = make('tr');
  const body = make('tbody');
  const empty = make('p', 'No bodies match.', 'mc-hint');
  const rows = getBodyRows([
    ...STARS,
    ...PLANETS,
    ...MOONS,
    ...ASTEROIDS,
    ...COMETS,
    ...INTERSTELLAR_OBJECTS,
    ...GALAXY_BODIES
  ]);
  const counts = countByKind(rows);

  let kind: BodyKindType | 'all' = 'all';
  let sort: { key: BodySortKeyType; direction: 'ascending' | 'descending' } = {
    key: 'name',
    direction: 'ascending'
  };
  let sorted = false;

  drawer.id = 'bodies';
  drawer.hidden = true;
  drawer.setAttribute('aria-labelledby', 'bodiesTitle');
  title.id = 'bodiesTitle';
  title.append(make('span', 'Bodies'), count);
  close.id = 'bodiesClose';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  search.id = 'bodiesSearch';
  search.type = 'search';
  search.placeholder = 'Find a body';
  search.autocomplete = 'off';
  search.setAttribute('aria-label', 'Find a body');
  kinds.setAttribute('role', 'group');
  kinds.setAttribute('aria-label', 'Kind');
  table.setAttribute('aria-labelledby', 'bodiesTitle');
  head.id = 'bodiesHead';
  body.id = 'bodiesRows';
  count.id = 'bodiesCount';
  kinds.id = 'bodiesKinds';
  empty.id = 'bodiesEmpty';
  empty.hidden = true;
  top.append(title, close);

  const thead = make('thead');

  thead.append(head);
  table.append(thead, body);
  scroll.append(table, empty);
  drawer.append(top, search, kinds, scroll);

  const render = () => {
    const shown = filterRows(
      sorted ? sortRows(rows, sort.key, sort.direction) : rows,
      { kind, query: search.value }
    );

    body.replaceChildren(...shown.map(makeRow));
    empty.hidden = shown.length > 0;
    count.textContent = formatNumber(shown.length);
    head.querySelectorAll('th').forEach((th) => {
      if (sorted && th.dataset.key === sort.key) {
        th.setAttribute('aria-sort', sort.direction);
      } else th.removeAttribute('aria-sort');
    });
    kinds.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
    });
  };
  const setOpen: SetBodiesOpenType = (open) => {
    const hadFocus = drawer.contains(document.activeElement);

    if (open) {
      // The popup and the Systems sheet would sit over the drawer
      hideBodyInfo();

      if (document.getElementById('systems')?.classList.contains('is-open')) {
        document.getElementById('systemsToggle')?.click();
      }

      render();
    }

    drawer.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));

    if (open) search.focus();
    else if (hadFocus) toggle.focus();
  };

  // The headings, each a button that sorts by its column
  head.replaceChildren(
    ...COLUMNS.map(([key, label, meaning]) => {
      const th = make<HTMLTableCellElement>('th');
      const button = make<HTMLButtonElement>('button', label);

      th.scope = 'col';
      th.dataset.key = key;
      button.type = 'button';

      // A symbol, a or e, is named in full, for screen readers and on hover
      if (meaning) {
        button.title = meaning;
        button.setAttribute('aria-label', `${meaning}, ${label}`);
      }

      button.addEventListener('click', () => {
        sort = {
          key,
          direction:
            sorted && sort.key === key && sort.direction === 'ascending'
              ? 'descending'
              : 'ascending'
        };
        sorted = true;
        render();
      });
      th.append(button);

      return th;
    }),
    make('td')
  );

  // A filter per kind, with how many there are
  kinds.replaceChildren(
    ...(['all', ...LISTED_KINDS] as const).map((value) => {
      const button = make<HTMLButtonElement>(
        'button',
        `${KIND_FILTERS[value]} ${counts[value] ?? 0}`
      );

      button.type = 'button';
      button.dataset.kind = value;
      button.addEventListener('click', () => {
        kind = value;
        render();
      });

      return button;
    })
  );

  search.addEventListener('input', render);
  body.addEventListener('click', (event) => {
    const lock = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '.mc-bodies-lock'
    );
    const target = findBodyById(lock?.dataset.id);

    if (!target) return;

    // Focus goes back to Bodies as the drawer closes
    setOpen(false);
    focusOn(target as CelestialBodyType);
  });
  close.addEventListener('click', () => setOpen(false));
  drawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Not also the info popup's Escape, which has nothing to close
      event.stopPropagation();
      setOpen(false);
    }
  });
  // The Systems sheet, on a narrow screen, opens over the drawer: close it
  document.getElementById('systemsToggle')?.addEventListener('click', () => {
    if (!drawer.hidden) setOpen(false);
  });

  // Right after the console, so it follows Bodies in Tab order
  toggle.closest('.mc-views')?.after(drawer);
  toggle.setAttribute('aria-controls', drawer.id);

  return setOpen;
};
