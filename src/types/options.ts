/**
 * Defines user interface options for toggling different visualization elements.
 *
 * **Available UI Options:**
 * - **`arrowHeads`**: Display directional arrowheads for trajectories.
 * - **`trajectory`**: Toggle visibility of object trajectories.
 * - **`moons`**: Show or hide planetary moons.
 * - **`comets`**: Show or hide comets.
 * - **`labels`**: Display names of celestial objects.
 * - **`asteroidBelts`**: Render asteroid belts in the visualization.
 * - **`asteroids`**: Render asteroids in the visualization.
 *
 * @interface UIOptionsInterface
 * @example
 * ```ts
 * const uiOptions: UIOptionsInterface = {
 *   arrowHeads: true,
 *   trajectory: true,
 *   moons: false,
 *   comets: true,
 *   labels: true,
 *   asteroids: true,
 *   asteroidBelts: false
 * };
 * ```
 */
export interface UIOptionsInterface {
  /** Display directional arrowheads for trajectories. */
  arrowHeads: boolean;
  /** How many of the nearest off-screen objects get a directional arrowhead. */
  arrowHeadsCount: number;
  /** Toggle visibility of object trajectories. */
  trajectory: boolean;
  /** Show or hide planetary moons. */
  moons: boolean;
  /** Show or hide comets. */
  comets: boolean;
  /** Show or hide the interstellar objects, on their open orbits (#105). */
  interstellar: boolean;
  /** Display names of celestial objects. */
  labels: boolean;
  /** Render asteroid belts in the visualization. */
  asteroidBelts: boolean;
  /** Render asteroids in the visualization. */
  asteroids: boolean;
  starfield: boolean;
}

/**
 * Defines available time step modes for controlling simulation speed.
 *
 * - **`framePerDay`**: Advances one day per frame.
 * - **`spedUp`**: Runs at a **faster-than-real-time** speed.
 * - **`realTime`**: Syncs with actual time progression.
 *
 * @typedef {'framePerDay' | 'spedUp' | 'realTime' | 'quarterFramePerDay'} TimeStepMode
 */
export type TimeStepMode =
  'framePerDay' | 'spedUp' | 'realTime' | 'quarterFramePerDay';

/**
 * Configuration for time step settings in the simulation.
 *
 * @interface TemporalOptionsInterface
 * @property {TimeStepMode} mode - The selected time step mode.
 *
 * @example
 * ```ts
 * const temporalSettings: TemporalOptionsInterface = {
 *   mode: 'spedUp'
 * };
 * ```
 */
export interface TemporalOptionsInterface {
  /** The selected time step mode. */
  mode: TimeStepMode;
}
