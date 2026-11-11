import { AU_METERS } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';
import {
  InterstellarObjectsType,
  OpenOrbitInterface,
  Radians
} from '@interstellar-tools/types';

/** Newton's method stops once a step is this small, in radians. */
const TOLERANCE = 1e-12;
const MAX_STEPS = 50;

/**
 * Solves Kepler's equation for an open orbit, $M = e \sinh F - F$, for the
 * hyperbolic anomaly $F$, by Newton's method from $F = \operatorname{asinh}(M / e)$.
 *
 * @param {number} meanAnomaly - The hyperbolic mean anomaly $M$, in radians.
 * @param {number} e - The eccentricity, above 1.
 * @returns {number} The hyperbolic anomaly $F$.
 *
 * @example
 * ```ts
 * solveHyperbolicKepler(0, 1.2); // 0: at periapsis
 * ```
 */
export const solveHyperbolicKepler = (
  meanAnomaly: number,
  e: number
): number => {
  let F = Math.asinh(meanAnomaly / e);

  for (let step = 0; step < MAX_STEPS; step++) {
    const change =
      (e * Math.sinh(F) - F - meanAnomaly) / (e * Math.cosh(F) - 1);

    F -= change;

    if (Math.abs(change) < TOLERANCE) break;
  }

  return F;
};

/**
 * Where a body on an open orbit is on a date: its true anomaly, from the time
 * it passes periapsis (`orbit.periapsisTime`) and its parent's gravitational
 * parameter. Open orbits have no period to move an angle on by, as closed
 * ones do, so it is worked out from the date every time.
 *
 * $$
 * M = \sqrt{\mu / |a|^3}\,(t - t_p), \quad M = e \sinh F - F, \quad
 * \nu = 2 \arctan\!\left(\sqrt{\tfrac{e + 1}{e - 1}} \tanh \tfrac{F}{2}\right)
 * $$
 *
 * @param {OpenOrbitInterface} orbit - The open orbit.
 * @param {Date} date - The date.
 * @param {number} mu - The parent's gravitational parameter, in m³/s².
 * @returns {Radians} The true anomaly, negative on the way in.
 *
 * @example
 * ```ts
 * getOpenOrbitTrueAnomaly(oumuamua.orbit, new Date(), sun.mu);
 * ```
 */
export const getOpenOrbitTrueAnomaly = (
  orbit: OpenOrbitInterface,
  date: Date,
  mu: number
): Radians => {
  const a = Math.abs(convertDistanceUnit(orbit.a, 'au').value) * AU_METERS;
  const { e } = orbit;
  const seconds = (date.getTime() - orbit.periapsisTime.getTime()) / 1000;
  const F = solveHyperbolicKepler(Math.sqrt(mu / a ** 3) * seconds, e);

  return (2 *
    Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2))) as Radians;
};

/**
 * Moves bodies on open orbits to where they are on a date, by setting each
 * orbit's `angle`, as `updatePositions` does for closed orbits each frame.
 *
 * @param {InterstellarObjectsType} bodies - The bodies, such as the interstellar objects.
 * @param {Date} date - The date, such as the simulation's.
 * @param {number} mu - Their parent's gravitational parameter, in m³/s²: the Sun's.
 *
 * @example
 * ```ts
 * updateOpenOrbits(INTERSTELLAR_OBJECTS, SIMULATION_DATE, sun.mu);
 * ```
 */
export const updateOpenOrbits = (
  bodies: InterstellarObjectsType,
  date: Date,
  mu: number
): void => {
  for (const { orbit } of bodies) {
    orbit.angle = getOpenOrbitTrueAnomaly(orbit, date, mu);
  }
};
