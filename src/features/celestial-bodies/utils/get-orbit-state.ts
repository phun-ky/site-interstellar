import { convertDistanceUnit } from '@interstellar-tools/equations';
import { convertTemporalUnit } from '@interstellar-tools/temporal';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';

import { getBodyPosition } from './get-body-position';

/** Kilometres in an au, and seconds in a day, for km/s from au/day. */
const KM_PER_AU = 149_597_870.7;
const SECONDS_PER_DAY = 86_400;

export type OrbitStateType = {
  /** How far the body is from what it orbits, in au. */
  range: number;
  /** Where it is round what it orbits, in degrees, 0 up the screen, clockwise. */
  bearing: number;
  /** How fast it moves along its orbit, in km/s; `null` without a closed orbit. */
  speed: number | null;
};

/**
 * Where a body is on its orbit right now: its range and bearing from what it
 * orbits, and its speed. The speed comes from the vis-viva equation,
 * $v = \sqrt{\mu (2/r - 1/a)}$, with $\mu = 4\pi^2 a^3 / T^2$ from the
 * orbit's own size and period, so no mass is needed.
 *
 * @param {OrbitingBodyType} body - The body.
 * @returns {OrbitStateType} Its range, bearing and speed.
 *
 * @example
 * ```ts
 * getOrbitState(earth); // { range: 0.9898, bearing: 40.3, speed: 30.1 }
 * ```
 */
export const getOrbitState = (body: OrbitingBodyType): OrbitStateType => {
  const { x, y } = getBodyPosition(body);
  const range = Math.hypot(x.value, y.value);
  const bearing = ((Math.atan2(y.value, x.value) * 180) / Math.PI + 450) % 360;
  const { orbit } = body;

  if (!orbit || !('a' in orbit) || !('period' in orbit) || !range) {
    return { range, bearing, speed: null };
  }

  const a = convertDistanceUnit(orbit.a, 'au').value;
  const days = convertTemporalUnit(orbit.period, 'd').value;
  const mu = (4 * Math.PI ** 2 * a ** 3) / days ** 2;
  const auPerDay = Math.sqrt(Math.max(0, mu * (2 / range - 1 / a)));

  return { range, bearing, speed: (auPerDay * KM_PER_AU) / SECONDS_PER_DAY };
};
