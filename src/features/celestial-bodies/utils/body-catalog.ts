import {
  ASTEROIDS,
  COMETS,
  GALAXIES,
  INTERSTELLAR_OBJECTS,
  MOONS,
  PLANETS,
  STARS,
  SYSTEMS
} from '@interstellar-tools/constants';
import { CelestialBodyType } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';

import { type GalaxyBodyType, getGalaxyBodies } from './galaxy-bodies';
import { getFlatPosition } from './orbit-orientation';

/** The kind of a body, from the dataset it belongs to. */
type BodyKindType =
  | 'system'
  | 'star'
  | 'planet'
  | 'moon'
  | 'comet'
  | 'asteroid'
  | 'interstellar'
  | 'galaxy';

const solarSystem = SYSTEMS.find(({ id }) => id === 'solar-system');

/**
 * The galaxies besides the Milky Way, placed round it from where the Sun is
 * on the map (where its Solar System is) and the way it moves (#105).
 */
export const GALAXY_BODIES: GalaxyBodyType[] = solarSystem?.orbit
  ? (() => {
      const { orbit } = solarSystem;
      const sun = getFlatPosition(orbit);
      const ahead = getFlatPosition(orbit, orbit.angle + 1e-6);

      return getGalaxyBodies(GALAXIES, sun, [
        ahead[0] - sun[0],
        ahead[1] - sun[1]
      ]);
    })()
  : [];

const BODIES_BY_ID = new Map<string, OrbitingBodyType>(
  [
    ...SYSTEMS,
    ...STARS,
    ...PLANETS,
    ...MOONS,
    ...COMETS,
    ...ASTEROIDS,
    ...INTERSTELLAR_OBJECTS,
    ...GALAXY_BODIES
  ].map((body) => [body.id, body])
);
const KIND_BY_ID = new Map<string, BodyKindType>([
  ...SYSTEMS.map(({ id }) => [id, 'system'] as const),
  ...STARS.map(({ id }) => [id, 'star'] as const),
  ...PLANETS.map(({ id }) => [id, 'planet'] as const),
  ...MOONS.map(({ id }) => [id, 'moon'] as const),
  ...COMETS.map(({ id }) => [id, 'comet'] as const),
  ...ASTEROIDS.map(({ id }) => [id, 'asteroid'] as const),
  ...INTERSTELLAR_OBJECTS.map(({ id }) => [id, 'interstellar'] as const),
  ...GALAXY_BODIES.map(({ id }) => [id, 'galaxy'] as const)
]);

/**
 * Looks up a system or celestial body by its `id`.
 *
 * Ids that are not in the datasets (like the Milky Way, `milky-way`, the root
 * everything else is placed round) return `undefined`.
 *
 * @param {string} [id] - The id to look up, typically a body's `parent`.
 * @returns {OrbitingBodyType | undefined} The matching system or body.
 *
 * @example
 * ```ts
 * findBodyById('earth')?.name; // "Earth"
 * findBodyById('milky-way'); // undefined
 * ```
 */
export const findBodyById = (id?: string): OrbitingBodyType | undefined =>
  id ? BODIES_BY_ID.get(id) : undefined;

/**
 * Tells what kind of body an id belongs to, from the dataset it is in.
 *
 * @param {string} id - The body's id.
 * @returns {BodyKindType | undefined} The kind, or `undefined` for an unknown id.
 *
 * @example
 * ```ts
 * getBodyKind('io'); // "moon"
 * ```
 */
export const getBodyKind = (id: string): BodyKindType | undefined =>
  KIND_BY_ID.get(id);

/**
 * Lists the stars, planets and moons that orbit a body (or sit in a system).
 *
 * Comets and asteroids are left out: they are many, and their wide orbits would
 * dwarf a star's planetary system.
 *
 * @param {string} id - The parent's id.
 * @returns {CelestialBodyType[]} The bodies whose `parent` is `id`.
 *
 * @example
 * ```ts
 * getChildBodies('earth').map(({ name }) => name); // ["Moon"]
 * ```
 */
export const getChildBodies = (id: string): CelestialBodyType[] =>
  [...STARS, ...PLANETS, ...MOONS].filter((body) => body.parent === id);
