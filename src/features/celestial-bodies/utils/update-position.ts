import { computeAngle, wrapAngle } from '@interstellar-tools/equations';
import { Radians, TimeStepInterface } from '@interstellar-tools/types';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';

import { isOpenOrbit } from './orbit-orientation';

/**
 * Updates the **orbital position** (angle) of a celestial body based on the given time step.
 *
 * **Mathematical Explanation:**
 *
 * The **true anomaly** ($V$), which determines a celestial body's position in its orbit,
 * changes over time according to **Kepler’s Laws**. The new angle is computed as:
 * $$
 * V(t) = V_0 + \Delta V
 * $$
 * where:
 * - $V_0$ is the **current true anomaly**.
 * - $\Delta V$ is the **change in anomaly** over the given time step.
 *
 * The updated **true anomaly** is then **wrapped within** the range $[0, 2\pi]$ to ensure periodicity.
 * Bodies without an `orbit` are left untouched.
 *
 * @param {TimeStepInterface} timeStep - The time step ($\Delta t$) that determines the amount of orbital progression.
 * @returns {(body: OrbitingBodyType) => void} A function that updates a celestial body's angle.
 *
 * @example
 * ```ts
 * const timeStep = { value: 1, unit: 'd' };
 * const update = updatePosition(timeStep);
 *
 * const planet = { name: 'Earth', orbit: { angle: 1.5, ...otherOrbitProps }, ...otherProps };
 * update(planet);
 * console.log(planet.orbit.angle); // Updated angle in radians, wrapped within [0, 2π]
 * ```
 *
 * @see [True Anomaly & Orbital Mechanics](https://en.wikipedia.org/wiki/True_anomaly)
 */
export const updatePosition = (
  timeStep: TimeStepInterface
): ((body: OrbitingBodyType) => void) => {
  return ({ orbit }: OrbitingBodyType) => {
    // Open orbits are placed by date instead (see updateOpenOrbits)
    if (!orbit || isOpenOrbit(orbit)) return;

    orbit.angle = wrapAngle(computeAngle(orbit, timeStep)) as Radians;
  };
};
