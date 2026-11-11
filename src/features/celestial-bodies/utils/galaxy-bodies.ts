import { AU_PER_LY } from '@interstellar-tools/constants';
import {
  convertDistanceUnit,
  galactocentricPosition
} from '@interstellar-tools/equations';
import {
  DegreesType,
  DistanceInterface,
  GalaxiesType
} from '@interstellar-tools/types';

/**
 * A galaxy as the map holds it, alongside the bodies: placed by its direction
 * and distance from the Sun (#105), with no parent and no orbit.
 */
export type GalaxyBodyType = {
  id: string;
  name: string;
  /** Its morphology, such as `SA(s)b`. */
  type: string;
  category: 'galaxy';
  parent?: undefined;
  orbit?: undefined;
  /** Half its diameter. */
  radius: DistanceInterface;
  /** How far it is from the Sun. */
  distance: DistanceInterface;
  /** Where it is on the map, from the Milky Way's centre, in au. */
  position: { x: DistanceInterface; y: DistanceInterface };
  display: { color: string };
};

/** A 2D point or direction on the map, in au. */
type PointType = [x: number, y: number];

const GALAXY_COLOR = '#cfd8ff';
const ly = (value: number): DistanceInterface => ({ value, unit: 'ly' });

/**
 * The galaxies besides the Milky Way, placed on the map. Each goes where its
 * direction and distance from the Sun put it (equations'
 * `galactocentricPosition`), seen from above the Milky Way's plane: its
 * offset from the Sun is laid onto the map's own axes, with the galactocentric
 * x axis (from the Sun towards the centre) along the line from the Sun to the
 * map's centre, and y (the way the Milky Way turns) along the Sun's motion.
 * So each galaxy lies in the right direction from the map's Sun.
 *
 * A galaxy without a direction (the Milky Way itself) is left out.
 *
 * @param {GalaxiesType} galaxies - The galaxies, such as `GALAXIES`.
 * @param {PointType} sun - Where the Sun is on the map, from the Milky Way's centre, in au.
 * @param {PointType} sunMotion - Which way the Sun moves round the Milky Way on the map.
 * @returns {GalaxyBodyType[]} The galaxies, placed.
 *
 * @example
 * ```ts
 * getGalaxyBodies(GALAXIES, [0, -1.7e9], [1, 0]);
 * ```
 */
export const getGalaxyBodies = (
  galaxies: GalaxiesType,
  sun: PointType,
  sunMotion: PointType
): GalaxyBodyType[] => {
  const length = Math.hypot(...sun);
  // Galactocentric x: from the Sun towards the centre
  const towardsCentre: PointType = [-sun[0] / length, -sun[1] / length];
  // Galactocentric y: the Sun's motion, square to x
  const along =
    sunMotion[0] * towardsCentre[0] + sunMotion[1] * towardsCentre[1];
  const rawY: PointType = [
    sunMotion[0] - along * towardsCentre[0],
    sunMotion[1] - along * towardsCentre[1]
  ];
  const rawLength = Math.hypot(...rawY);
  const withRotation: PointType = [rawY[0] / rawLength, rawY[1] / rawLength];
  const sunAt = galactocentricPosition(
    { l: 0 as DegreesType, b: 0 as DegreesType },
    ly(0)
  );

  return galaxies.flatMap((galaxy) => {
    if (!galaxy.direction) return [];

    const at = galactocentricPosition(galaxy.direction, galaxy.distance, {
      unit: 'ly'
    });
    const dx = (at.x.value - sunAt.x.value) * AU_PER_LY;
    const dy = (at.y.value - sunAt.y.value) * AU_PER_LY;
    const diameter = convertDistanceUnit(galaxy.diameter, 'ly').value;

    return [
      {
        id: galaxy.id,
        name: galaxy.name,
        type: galaxy.type,
        category: 'galaxy' as const,
        radius: ly(diameter / 2),
        distance: galaxy.distance,
        position: {
          x: {
            value: sun[0] + dx * towardsCentre[0] + dy * withRotation[0],
            unit: 'au'
          },
          y: {
            value: sun[1] + dx * towardsCentre[1] + dy * withRotation[1],
            unit: 'au'
          }
        },
        display: { color: GALAXY_COLOR }
      }
    ];
  });
};
