import {
  ASTEROIDS,
  COMETS,
  GALAXIES,
  INTERSTELLAR_OBJECTS,
  MILLISECONDS_PER_DAY,
  MOONS,
  PLANETS,
  STARS,
  SYSTEMS
} from '@interstellar-tools/constants';

import {
  SCALE,
  SIMULATION_DATE,
  THRESHOLD_ASTEROID_RENDER,
  THRESHOLD_COMET_RENDER,
  THRESHOLD_MOON_RENDER,
  THRESHOLD_PLANET_RENDER
} from './config/constants';
import { setupApp } from './config/setup-app';
import { offsetX, offsetY } from './features/canvas/config/camera';
import { getReference } from './features/canvas/config/camera/get-reference';
import { OPTIONS_UI } from './features/canvas/config/hud';
import { timeStep } from './features/canvas/config/time-step';
import { generateTimeStep } from './features/canvas/config/time-step/generate-time-step';
import { getViewportSize } from './features/canvas/get-viewport-size';
import { setupCanvas } from './features/canvas/setup-canvas';
import { updateOpenOrbits } from './features/celestial-bodies/utils/open-orbit';
import { updatePositions } from './features/celestial-bodies/utils/update-positions';
import { initializeMinimap } from './features/minimap/initialize-minimap';
import { updateMinimap } from './features/minimap/update-minimap';
import { setupSound } from './features/sound/sound';
import { setupLockCentre } from './features/ui/lock-centre';
import { showSolarSystem } from './features/ui/lock-on';
import { setupMainMenu } from './features/ui/main-menu';
import { setupSettings } from './features/ui/settings';
import { setupUI } from './features/ui/setup-UI';
import { setupSystemsSheet } from './features/ui/systems-sheet';
import { updateBodiesInView } from './features/ui/update-bodies-in-view';
import { updateCoordinates } from './features/ui/update-coordinates';
import { updateSimulationDate } from './features/ui/update-simulation-date';
import { updateZoom } from './features/ui/update-zoom';
import { setupViews } from './features/ui/views';
import { draw } from './utils/draw';
import { attachEventHandlers } from './utils/event-handlers';
import { waitFor } from './utils/wait-for';

/** The Sun's gravitational parameter, in m³/s², for the open orbits round it. */
const SUN_MU = STARS.find(({ id }) => id === 'sun')?.mu ?? 0;
/**
 * **Main application entry point** for initializing and running the simulation.
 *
 * **Initialization Steps:**
 * 1. **Set up the UI** elements.
 * 2. **Create and configure the canvas**.
 * 3. **Initialize global settings**.
 * 4. **Attach event handlers** for interaction.
 * 5. **Start the simulation loop**.
 *
 * **Simulation Loop:**
 * - Updates **planetary positions** based on time step.
 * - Advances **simulation time**.
 * - Updates **UI components** like coordinates, zoom, and minimap.
 * - Uses `requestAnimationFrame` for smooth rendering.
 *
 * @returns {Promise<void>} Asynchronous function to initialize and start the simulation.
 *
 * @example
 * ```ts
 * import App from './App';
 * App();
 * ```
 */
const App = async (): Promise<void> => {
  setupUI();
  setupMainMenu();
  setupSettings();
  setupSystemsSheet();
  setupViews();
  setupLockCentre();
  setupSound();

  const { canvas, space } = setupCanvas();

  setupApp(canvas);
  // The map opens on the Solar system view: locked on the Sun, its planets framed
  showSolarSystem(false);

  const simDateDisplayElement = document.getElementById('simDate');
  // Animation function
  const update = () => {
    if (!space) throw Error('Required space context not found');

    // CSS pixels, the space everything is drawn in (not the device-pixel buffer size)
    const { width: canvasWidth, height: canvasHeight } =
      getViewportSize(canvas);
    const { referenceX, referenceY } = getReference(canvas);

    // Open orbits are placed by date, the simulation's, every frame
    updateOpenOrbits(INTERSTELLAR_OBJECTS, SIMULATION_DATE, SUN_MU);

    // Draw everything related to canvas
    draw({
      space,
      scale: SCALE,
      galaxies: GALAXIES,
      planets: PLANETS,
      asteroids: ASTEROIDS,
      stars: STARS,
      moons: MOONS,
      comets: COMETS,
      interstellarObjects: INTERSTELLAR_OBJECTS,
      referenceX,
      referenceY,
      canvasHeight,
      canvasWidth,
      offsetX,
      offsetY
    });

    if (!globalThis.PAUSE) {
      // Define speed modes
      generateTimeStep();

      // Calculate star system and star positions per frame
      updatePositions(SYSTEMS, timeStep);
      updatePositions(STARS, timeStep);

      if (SCALE.value > THRESHOLD_PLANET_RENDER) {
        updatePositions(PLANETS, timeStep);
      }

      if (SCALE.value > THRESHOLD_MOON_RENDER && OPTIONS_UI.moons) {
        updatePositions(MOONS, timeStep);
      }

      if (SCALE.value > THRESHOLD_COMET_RENDER && OPTIONS_UI.comets) {
        updatePositions(COMETS, timeStep);
      }

      if (SCALE.value > THRESHOLD_ASTEROID_RENDER && OPTIONS_UI.asteroids) {
        updatePositions(ASTEROIDS, timeStep);
      }

      // Increase the time per frame
      SIMULATION_DATE.setTime(
        SIMULATION_DATE.getTime() + timeStep.value * MILLISECONDS_PER_DAY
      );
      // Update the UI with the current simulation date
      updateSimulationDate(simDateDisplayElement, SIMULATION_DATE);
    }

    // Update the HUD
    updateCoordinates(SCALE, offsetX.value, offsetY.value);
    updateZoom(SCALE);
    requestAnimationFrame(update);
  };

  attachEventHandlers({
    space,
    canvas
  });

  initializeMinimap();
  update();
  await waitFor(0);
  updateMinimap(STARS, SCALE, offsetX, offsetY);

  updateBodiesInView({
    scale: SCALE,
    canvas
  });
};

export default App;
