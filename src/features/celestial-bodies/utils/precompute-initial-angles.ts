import { J2000_UTC, MILLISECONDS_PER_DAY } from '@interstellar-tools/constants';
import { computeAngle } from '@interstellar-tools/equations';
import { Radians } from '@interstellar-tools/types';

import {
  OrbitingBodiesType,
  OrbitingBodyType
} from '../../../types/orbiting-bodies';

import { isOpenOrbit } from './orbit-orientation';

/** Each body's true anomaly at J2000, as the dataset gives it, by body id. */
const J2000_ANGLES = new Map<string, Radians>();

/**
 * Precomputes the initial **orbital angles** for celestial bodies relative to the J2000 epoch.
 *
 * The function determines the number of days elapsed since **J2000 (January 1, 2000, 12:00 TT)**
 * and uses this to compute the **initial orbital angles** ($\theta_0$) of celestial bodies.
 *
 * **Mathematical Explanation:**
 *
 * The elapsed time $\Delta T$ is calculated as:
 * $$
 * \Delta T = \frac{t - t_{J2000}}{1\text{ day}}
 * $$
 * where:
 * - $t$ is the provided date in milliseconds.
 * - $t_{J2000}$ is the timestamp for J2000.
 * - $1$ day is the number of milliseconds in a day ($86,400,000$ ms).
 *
 * The initial orbital angle is then computed using Keplerian motion equations via `computeAngle`,
 * always from the body's J2000 angle (kept the first time a body is seen), so this can be
 * called again later, for example to reset the simulation to the current time.
 * Bodies without an `orbit` are skipped.
 *
 * @param {OrbitingBodiesType} bodies - The array of celestial bodies whose angles need to be computed.
 * @param {Date} date - The date from which to compute the initial angles.
 * @returns {void} This function does not return a value; it updates the `orbit.angle` property of each body.
 *
 * @example
 * ```ts
 * const currentDate = new Date();
 * precomputeInitialAngles(celestialBodies, currentDate);
 * console.log(celestialBodies[0].orbit.angle); // Output: Computed initial angle in radians
 * ```
 *
 * @see [J2000 Epoch](https://en.wikipedia.org/wiki/Epoch_(astronomy)#Julian_years_and_J2000)
 */
export const precomputeInitialAngles = (
  bodies: OrbitingBodiesType,
  date: Date
): void => {
  const deltaT = (date.getTime() - J2000_UTC.getTime()) / MILLISECONDS_PER_DAY; // Days since J2000

  bodies.forEach(({ id, orbit }: OrbitingBodyType) => {
    // Open orbits are placed by date instead (see updateOpenOrbits)
    if (!orbit || isOpenOrbit(orbit)) return;

    // The simulation moves orbit.angle on, so keep the J2000 angle from the dataset
    if (!J2000_ANGLES.has(id)) J2000_ANGLES.set(id, orbit.angle);

    const angle = J2000_ANGLES.get(id) as Radians;

    orbit.angle = computeAngle(
      { ...orbit, angle },
      { value: deltaT, unit: 'd' }
    ); // Set initial angle
  });
};
