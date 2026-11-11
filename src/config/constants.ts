/**
 * Astronomical and simulation-related constants for space visualization.
 *
 * These constants define various unit conversions, scale factors, and rendering thresholds
 * used in the simulation.
 */

import { AU_PER_LY, KM_PER_AU } from '@interstellar-tools/constants';

/** 1 AU in pixels at the default scale. */
export const AU_IN_PX = 960;

/** 1 Light-Year in pixels at the default scale. */
export const LY_IN_PX = AU_IN_PX * AU_PER_LY;

/** Zooming factor for scaling operations. */
export const ZOOM_FACTOR = 1.1;

/** Minimum and maximum allowed scale factors. */
export const MIN_SCALE = 1e-20;

export const MAX_SCALE = 1e20;

/** Threshold for rendering moons (dependent on zoom level). */
export const THRESHOLD_MOON_RENDER = 4;

/**
 * The smallest a galaxy's black hole is drawn, in pixels. Bodies get their
 * sizes from `getDrawnSize` (#109).
 */
export const MIN_BLACK_HOLE_SIZE = 10;

/** Thresholds for rendering and labeling celestial objects. */
export const THRESHOLD_PLANET_LABEL = 0.002600668431442156;

export const THRESHOLD_COMET_LABEL = 0.0007533210080944772;

export const THRESHOLD_PLANET_RENDER = 0.0007533210080944772;

export const THRESHOLD_COMET_RENDER = 0.0007533210080944772;

export const THRESHOLD_ASTEROID_BELT_RENDER = 0.0007533210080944772;

export const THRESHOLD_ASTEROID_RENDER = 0.0007533210080944772;

/** Initial scale factor for the simulation. */
export const INITIAL_SCALE = 2.389618154589582e-10;

/** Global scale object to manage dynamic scaling. */
export const SCALE = { value: INITIAL_SCALE };

/** Scaling factor for rendering orbital trails. */
export const TRAIL_SCALING_FACTOR = 0.5;

/** Stores the simulation's current date. */
export const SIMULATION_DATE = new Date();

/** 1 Kilometre in pixels at the default scale. */
export const KM_IN_PX = AU_IN_PX / KM_PER_AU;
