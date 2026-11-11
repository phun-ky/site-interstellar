import { UIOptionsInterface } from '../../../../types/options';

/**
 * UI configuration options for toggling visual elements in the space visualization.
 *
 * This object controls whether certain elements, such as trajectories, labels,
 * moons, arrow indicators, comets, asteroids and asteroid belts, should be displayed.
 *
 * Each property represents a boolean flag that determines the visibility of a
 * specific feature in the visualization.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
 */

export const OPTIONS_UI: UIOptionsInterface = {
  /** Whether to display orbital trajectories. */
  trajectory: false,

  /** Whether to display labels for celestial bodies. */
  labels: false,

  /** Whether to render moons in the visualization. */
  moons: false,

  /** Whether to show directional arrows indicating off-screen objects. */
  arrowHeads: false,

  /** How many of the nearest off-screen objects get a directional arrow. */
  arrowHeadsCount: 10,

  /** Whether to display comets in the visualization. */
  comets: false,

  /** Whether to display the interstellar objects, on their open orbits. */
  interstellar: false,

  /** Whether to visualize asteroid belts. */
  asteroidBelts: false,

  /** Whether to visualize asteroids. */
  asteroids: false,
  starfield: false
};
