import {
  ASTEROIDS,
  COMETS,
  MOONS,
  PLANETS,
  STARS,
  SYSTEMS
} from '@interstellar-tools/constants';
import { CelestialBodyType } from '@interstellar-tools/types';

import { offsetX, offsetY } from '../features/canvas/config/camera';
import { timeStep } from '../features/canvas/config/time-step';
import { generateTimeStep } from '../features/canvas/config/time-step/generate-time-step';
import { getBodyPosition } from '../features/celestial-bodies/utils/get-body-position';
import { precomputeInitialAngles } from '../features/celestial-bodies/utils/precompute-initial-angles';
import { updatePositions } from '../features/celestial-bodies/utils/update-positions';
import { updateScaleDisplay } from '../features/ui/update-scale-display';
import { distanceToPixels } from '../utils/distance/distance-to-pixels';
import { getParentBodyOffset } from '../utils/offset/get-parent-body-offset';
import { normalizeParentOffset } from '../utils/offset/normalize-parent-offset';

import { SCALE, SIMULATION_DATE } from './constants';
import { setUIOptions } from './set-UI-options';

/**
 * Initializes and configures the space visualization application.
 *
 * This function sets up the simulation environment, initializes UI options,
 * precomputes initial angles for celestial bodies, manages global state variables,
 * and updates orbital positions.
 *
 * @example
 * ```ts
 * setupApp();
 * ```
 */
export const setupApp = () => {
  const trajectoryCheckboxElement = document.getElementById(
    'toggleTrajectory'
  ) as HTMLInputElement;
  const moonsCheckboxElement = document.getElementById(
    'toggleMoons'
  ) as HTMLInputElement;
  const cometsCheckboxElement = document.getElementById(
    'toggleComets'
  ) as HTMLInputElement;
  const interstellarCheckboxElement = document.getElementById(
    'toggleInterstellar'
  ) as HTMLInputElement;
  const labelCheckboxElement = document.getElementById(
    'toggleLabels'
  ) as HTMLInputElement;
  const toggleArrowheadsElement = document.getElementById(
    'toggleArrowheads'
  ) as HTMLInputElement;
  const asteroidBeltsCheckboxElement = document.getElementById(
    'toggleAsteroidBelts'
  ) as HTMLInputElement;
  const asteroidsCheckboxElement = document.getElementById(
    'toggleAsteroids'
  ) as HTMLInputElement;
  const starfieldCheckboxElement = document.getElementById(
    'toggleStarfield'
  ) as HTMLInputElement;

  setUIOptions({
    trajectoryCheckboxElement,
    moonsCheckboxElement,
    cometsCheckboxElement,
    interstellarCheckboxElement,
    labelCheckboxElement,
    toggleArrowheadsElement,
    asteroidBeltsCheckboxElement,
    asteroidsCheckboxElement,
    starfieldCheckboxElement
  });

  precomputeInitialAngles(
    [...SYSTEMS, ...STARS, ...PLANETS, ...MOONS, ...COMETS, ...ASTEROIDS],
    SIMULATION_DATE
  );

  // Global state variables for simulation behavior
  globalThis.PAUSE = false;
  globalThis.LOCKED_CELESTIAL_BODY = null;
  globalThis.FOCUSED_CELESTIAL_BODY = null;
  globalThis.TRAJECTORY_TYPE = 'orbits';
  globalThis.TRAJECTORY_TRAILS = {};
  globalThis.IS_ZOOMING_OR_PANNING = false; // Initialize
  globalThis.NEAREST_BODIES = {};
  globalThis.LABEL_BOXES = [];
  globalThis.BODIES_IN_VIEWPORT =
    globalThis.BODIES_IN_VIEWPORT ?? new Set<string>();

  globalThis.LAST_CANVAS_SIZE = { width: 0, height: 0 };

  if (globalThis.LOCKED_CELESTIAL_BODY !== null) {
    // Calculate the body's position in pixel coordinates
    const { x, y } = getBodyPosition(globalThis.LOCKED_CELESTIAL_BODY);
    const xPX = x ? distanceToPixels(x, SCALE) : 0;
    const yPX = y ? distanceToPixels(y, SCALE) : 0;
    const { parentOffsetX, parentOffsetY } = getParentBodyOffset(
      (globalThis.LOCKED_CELESTIAL_BODY as CelestialBodyType).parent,
      SCALE
    );

    // Adjust offsets to center the body in the viewport
    offsetX.value -= normalizeParentOffset(xPX, parentOffsetX, 1);
    offsetY.value -= normalizeParentOffset(yPX, parentOffsetY, 1);
  }

  const scaleDisplay = document.getElementById('scaleDisplay') as HTMLElement;

  // Generate the first timeStep
  generateTimeStep();

  // Initial computation of star positions
  updatePositions(SYSTEMS, timeStep);
  updatePositions(STARS, timeStep);
  updatePositions(PLANETS, timeStep);
  updatePositions(MOONS, timeStep);
  updatePositions(COMETS, timeStep);
  updatePositions(ASTEROIDS, timeStep);

  updateScaleDisplay(scaleDisplay, SCALE);
};
