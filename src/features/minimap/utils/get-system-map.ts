import { convertDistanceUnit } from '@interstellar-tools/equations';
import { CelestialBodyType } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';
import {
  findBodyById,
  getBodyKind,
  getChildBodies
} from '../../celestial-bodies/utils/body-catalog';

/** The system a body is shown in: what sits in the middle and what circles it. */
export type SystemMapType = {
  /** The body in the middle: the focused body's parent, or a star itself. */
  centre: OrbitingBodyType;
  /** What circles the centre, innermost first. */
  rings: CelestialBodyType[];
  /** The focused body, the centre or one of the rings. */
  focus: OrbitingBodyType;
  /** The system's name, as in "Solar system" or "Jupiter system". */
  name: string;
};

/** A body's semi-major axis, in au; 0 without an orbit. */
export const getOrbitSize = (body: CelestialBodyType): number =>
  body.orbit ? convertDistanceUnit(body.orbit.a, 'au').value : 0;

/**
 * The bodies that ring a centre: a star's planets, or anything else's
 * children (a planet's moons, a system's stars).
 */
const getRings = (centre: OrbitingBodyType): CelestialBodyType[] => {
  const kind = getBodyKind(centre.id);

  return getChildBodies(centre.id).filter(
    (child) =>
      child.orbit && (kind !== 'star' || getBodyKind(child.id) === 'planet')
  );
};

/**
 * Works out the system to show a body in: its parent with its siblings
 * (Earth among the planets, the Moon round Earth). A star is the centre of
 * its own system (the Sun with its planets), when it has one. Dwarf planets
 * are left out, but for the focused one, as they would crowd the map.
 *
 * @param {OrbitingBodyType} body - The focused body.
 * @returns {SystemMapType | null} The system, or `null` when the body is in none.
 *
 * @example
 * ```ts
 * getSystemMap(earth)?.name; // "Solar system"
 * getSystemMap(io)?.name; // "Jupiter system"
 * ```
 */
export const getSystemMap = (body: OrbitingBodyType): SystemMapType | null => {
  const parent = findBodyById(body.parent);
  const own = getRings(body);
  const siblings = parent ? getRings(parent) : [];
  const useOwn =
    (getBodyKind(body.id) === 'star' && own.length > 0) || !siblings.length;
  const centre = useOwn ? body : parent;
  const rings = (useOwn ? own : siblings)
    .filter((ring) => ring.category !== 'planetoid' || ring.id === body.id)
    .sort((a, b) => getOrbitSize(a) - getOrbitSize(b));

  if (!centre || !rings.length) return null;

  const name = centre.id === 'sun' ? 'Solar system' : `${centre.name} system`;

  return { centre, rings, focus: body, name };
};
