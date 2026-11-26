import { MILLISECONDS_PER_DAY } from '@interstellar-tools/constants';

import { lastTimestamp, SPEED_MODE, timeStep } from '.';

/** The longest frame counted in real time, in milliseconds. */
const MAX_FRAME_MS = 250;

/**
 * Generates a time step value based on the selected speed mode while accounting for different monitor refresh rates.
 *
 * This function updates `timeStep.value` and `timeStep.unit` to adjust the
 * simulation speed. The speed mode is determined by the `SPEED_MODE` value.
 * If no mode is explicitly set, the time step is the real time elapsed since
 * the last frame, so the simulation runs at real time on any refresh rate
 * (60Hz, 144Hz or a dropped frame alike).
 *
 * The function supports the following modes:
 * - `'quarterFramePerDay'`: Each frame corresponds to 0.25 day.
 * - `'framePerDay'`: Each frame corresponds to 1 day.
 * - `'spedUp'`: Each frame corresponds to 10 days.
 * - `'insane'`: Each frame corresponds to 1000 days.
 * - Default: the real time elapsed, at most `MAX_FRAME_MS` a frame.
 *
 * @returns {void}
 *
 * @example
 * ```ts
 * generateTimeStep();
 * console.log(timeStep.value, timeStep.unit);
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
 */
export const generateTimeStep = (): void => {
  const mode = SPEED_MODE.value;
  const now = performance.now();
  // Compute elapsed time in milliseconds
  const deltaTime = now - lastTimestamp.value;

  // Always update lastTimestamp before returning
  lastTimestamp.value = now;

  if (mode === 'quarterFramePerDay') {
    timeStep.value = 0.25;
    timeStep.unit = 'd';

    return;
  }

  if (mode === 'framePerDay') {
    timeStep.value = 1;
    timeStep.unit = 'd';

    return;
  }

  if (mode === 'spedUp') {
    timeStep.value = 10; // Example factor
    timeStep.unit = 'd';

    return;
  }

  if (mode === 'insane') {
    timeStep.value = 1000; // Example factor
    timeStep.unit = 'd';

    return;
  }

  // The frame's own length is already the time that passed, at any refresh
  // rate. Capped, so a hold or a stalled tab does not jump on when it resumes
  timeStep.value = Math.min(deltaTime, MAX_FRAME_MS) / MILLISECONDS_PER_DAY;
  timeStep.unit = 'd';
};
