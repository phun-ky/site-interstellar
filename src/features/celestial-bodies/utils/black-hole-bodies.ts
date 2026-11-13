import {
  DistanceInterface,
  GalaxiesType,
  MassInterface
} from '@interstellar-tools/types';

/**
 * A galaxy's central black hole as the map holds it, alongside the bodies:
 * on its galaxy, as the Sun sits on the Solar System, with no orbit.
 */
export type BlackHoleBodyType = {
  id: string;
  name: string;
  /** What it is: `Supermassive black hole`. */
  type: string;
  category: 'black hole';
  /** Its galaxy: `milky-way` for Sagittarius A*, which isn't a body on the map. */
  parent: string;
  orbit?: undefined;
  /** Its event horizon's radius. */
  radius: DistanceInterface;
  mass: MassInterface;
  /** How far it is from the Sun. */
  distance: DistanceInterface;
  display: { color: string };
};

/** How a black hole is drawn: white, as Sagittarius A* always has been. */
const BLACK_HOLE_COLOR = 'white';

/**
 * An id for a black hole the data gives none, from its name, as
 * `sagittarius-a-star` is for Sagittarius A*.
 *
 * @param {string} name - Its name, such as `M87*`.
 * @returns {string} The id, such as `m87-star`.
 *
 * @example
 * ```ts
 * toBlackHoleId('Centaurus A*'); // "centaurus-a-star"
 * ```
 */
export const toBlackHoleId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\*/g, ' star')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The galaxies' central black holes, as bodies of their own: Sagittarius A*
 * at the Milky Way's centre, and M31*, M87* and Centaurus A* at their
 * galaxies' cores. A galaxy without a known black hole (Triangulum) has none.
 *
 * @param {GalaxiesType} galaxies - The galaxies, such as `GALAXIES`.
 * @returns {BlackHoleBodyType[]} The black holes.
 *
 * @example
 * ```ts
 * getBlackHoleBodies(GALAXIES).map(({ id }) => id);
 * // ["sagittarius-a-star", "m31-star", "m87-star", "centaurus-a-star"]
 * ```
 */
export const getBlackHoleBodies = (
  galaxies: GalaxiesType
): BlackHoleBodyType[] =>
  galaxies.flatMap(({ id, distance, blackHole }) =>
    blackHole
      ? [
          {
            id: blackHole.id ?? toBlackHoleId(blackHole.name),
            name: blackHole.name,
            type: 'Supermassive black hole',
            category: 'black hole' as const,
            parent: id,
            radius: blackHole.radius,
            mass: blackHole.mass,
            distance: blackHole.distance ?? distance,
            display: { color: BLACK_HOLE_COLOR }
          }
        ]
      : []
  );
