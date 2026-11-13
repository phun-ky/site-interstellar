import { AU_PER_LY } from '@interstellar-tools/constants';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';
import {
  findBodyById,
  getBodyKind
} from '../../celestial-bodies/utils/body-catalog';

import {
  getOrbitSize,
  getSystemMap,
  type SystemMapType
} from './get-system-map';

/** The Milky Way's radius, in au: half its 87,410 ly. */
export const MILKY_WAY_RADIUS_AU = (87_410 / 2) * AU_PER_LY;

/** A point on the map, from the Milky Way's centre, in au. */
export type MapPointType = { x: number; y: number };

/**
 * What the minimap shows (#117): one level up from what the map shows.
 *
 * - `system`: a system, with the body in it marked.
 * - `galaxy`: the Milky Way, with a marker where the map is.
 * - `neighbours`: the Milky Way among its neighbouring galaxies.
 */
export type MinimapContextType =
  | { kind: 'system'; system: SystemMapType }
  | { kind: 'galaxy'; marker: MapPointType; name: string | null }
  | { kind: 'neighbours'; focusId: string };

/** What the map shows: what is locked, if anything, and how much of space. */
export type MinimapViewType = {
  /** The locked body, or `null`. */
  locked: OrbitingBodyType | null;
  /** Half the map's width, in au. */
  halfWidthAu: number;
  /** The middle of the map, from the Milky Way's centre, in au. */
  centreAu: MapPointType;
  /** Where the locked body is, from the Milky Way's centre, in au. */
  lockedAu?: MapPointType;
};

/** The Milky Way map stands back for the neighbours once the map shows this share of its radius. */
const GALAXY_SHARE = 0.5;
/**
 * A system to show for a body, with the body marked: its own system, as
 * `getSystemMap` gives it, with a small body (an asteroid or a comet) on a
 * closed orbit added among the planets, so it can be marked too.
 *
 * @param {OrbitingBodyType} body - The body.
 * @returns {SystemMapType | null} The system, or `null` without one.
 */
const getMarkedSystem = (body: OrbitingBodyType): SystemMapType | null => {
  const system = getSystemMap(body);

  if (!system) return null;

  const isPlaced =
    system.centre.id === body.id ||
    system.rings.some((ring) => ring.id === body.id);

  if (isPlaced || !('orbit' in body) || getOrbitSize(body as never) <= 0) {
    return system;
  }

  const rings = [...system.rings, body as SystemMapType['rings'][number]].sort(
    (a, b) => getOrbitSize(a) - getOrbitSize(b)
  );

  return { ...system, rings };
};
/** How far a system reaches: its outermost orbit's semi-major axis, in au. */
const getReach = ({ rings }: SystemMapType): number =>
  Math.max(0, ...rings.map(getOrbitSize));
/**
 * The systems above a body, innermost first: a moon's planet's, then the
 * planet's star's. A body counts only once, so this always ends.
 *
 * @param {OrbitingBodyType} body - The body.
 * @returns {SystemMapType[]} The systems.
 */
const getSystemLadder = (body: OrbitingBodyType): SystemMapType[] => {
  const ladder: SystemMapType[] = [];
  const seen = new Set<string>();

  let current: OrbitingBodyType | undefined = body;

  while (current && !seen.has(current.id)) {
    seen.add(current.id);

    const system = getMarkedSystem(current);

    if (!system) break;

    ladder.push(system);
    current =
      system.centre.id === current.id
        ? findBodyById(system.centre.parent)
        : system.centre;
  }

  return ladder;
};

/**
 * What the minimap shows for what the map shows (#117): one level up, never
 * a copy of the map. It climbs from the locked body to the first map that
 * reaches further than the map's half width:
 *
 * 1. The locked body's system, then its planet's star's: a moon among its
 *    planet's moons, a planet or an asteroid among the planets.
 * 2. The Milky Way, with a marker on the locked body, or on the middle of the
 *    map with nothing locked: the Sun at solar system scale.
 * 3. The Milky Way among its neighbours, as in the Galaxy view, or with a
 *    galaxy locked.
 *
 * @param {MinimapViewType} view - What the map shows.
 * @returns {MinimapContextType} What the minimap shows.
 *
 * @example
 * ```ts
 * getMinimapContext({ locked: sun, halfWidthAu: 60, centreAu, lockedAu });
 * // { kind: 'galaxy', marker: lockedAu, name: 'Sun' }
 * ```
 */
export const getMinimapContext = ({
  locked,
  halfWidthAu,
  centreAu,
  lockedAu
}: MinimapViewType): MinimapContextType => {
  if (locked && getBodyKind(locked.id) === 'galaxy') {
    return { kind: 'neighbours', focusId: locked.id };
  }

  if (locked) {
    const system = getSystemLadder(locked).find(
      (rung) => getReach(rung) > halfWidthAu
    );

    if (system) return { kind: 'system', system };
  }

  if (halfWidthAu < MILKY_WAY_RADIUS_AU * GALAXY_SHARE) {
    return {
      kind: 'galaxy',
      marker: (locked && lockedAu) || centreAu,
      name: locked?.name ?? null
    };
  }

  return { kind: 'neighbours', focusId: 'milky-way' };
};
