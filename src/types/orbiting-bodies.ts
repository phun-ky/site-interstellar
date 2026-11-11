import type {
  CelestialBodyType,
  InterstellarObjectInterface,
  SystemInterface
} from '@interstellar-tools/types';

import type { GalaxyBodyType } from '../features/celestial-bodies/utils/galaxy-bodies';

/**
 * Anything that can take part in the orbital hierarchy: celestial bodies,
 * the star systems they belong to, the interstellar objects, and the galaxies
 * placed round the Milky Way (#105). Each entry may have an `orbit` around its
 * `parent`; a galaxy has a fixed `position` instead.
 */
export type OrbitingBodyType =
  | CelestialBodyType
  | SystemInterface
  | InterstellarObjectInterface
  | GalaxyBodyType;

export type OrbitingBodiesType = OrbitingBodyType[];
