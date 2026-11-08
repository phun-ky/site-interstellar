import { ASTEROID_BELTS, SYSTEMS } from '@interstellar-tools/constants';
import {
  AsteroidsType,
  CometsType,
  GalaxiesType,
  MoonsType,
  PlanetsType,
  StarsType,
  ValueInterface
} from '@interstellar-tools/types';

import {
  MAX_CELESTIAL_BODY_SIZE,
  MAX_MOON_SIZE,
  MAX_PLANET_SIZE,
  MAX_STAR_SIZE,
  THRESHOLD_ASTEROID_BELT_RENDER,
  THRESHOLD_ASTEROID_RENDER,
  THRESHOLD_COMET_LABEL,
  THRESHOLD_COMET_RENDER,
  THRESHOLD_MOON_RENDER,
  THRESHOLD_PLANET_LABEL,
  THRESHOLD_PLANET_RENDER
} from '../config/constants';
import { drawDirectionalArrows } from '../features/arrows/draw-arrowheads';
import { getHudObstacles } from '../features/arrows/utils/get-clear-bounds';
import { OPTIONS_UI } from '../features/canvas/config/hud';
import { drawBelts } from '../features/celestial-bodies/asteroids/draw-belts';
import { drawCelestialBodies } from '../features/celestial-bodies/draw-celestial-bodies';
import { drawGalaxy } from '../features/celestial-bodies/draw-galaxy';
import { drawLockReticle } from '../features/celestial-bodies/draw-lock-reticle';
import { drawOrbits } from '../features/celestial-bodies/orbits/draw';
import { getAbsolutePosition } from '../features/celestial-bodies/utils/get-absolute-position';
import { getBodyPosition } from '../features/celestial-bodies/utils/get-body-position';
import { drawLabels, getLabelCandidates } from '../features/labels/draw';
import { drawGalaxyLabel } from '../features/labels/draw-galaxy-label';
import { type LabelCandidateType } from '../features/labels/utils/place-labels';
import { drawStarfield } from '../features/starfield/draw-starfield';
import { initializeStarfield } from '../features/starfield/initialize-starfield';
import { OrbitingBodyType } from '../types/orbiting-bodies';

import { distanceToPixels } from './distance/distance-to-pixels';
import { getParentBodyOffset } from './offset/get-parent-body-offset';
import { normalizeParentOffset } from './offset/normalize-parent-offset';

/** Room kept clear around the focused body for arrows, beyond its drawn radius, in pixels. */
const FOCUS_KEEP_OUT_MARGIN = 32;
/** How far from the centre arrows must stay: the locked body's drawn radius plus a margin. */
const getFocusKeepOut = (): number => {
  const locked = globalThis.LOCKED_CELESTIAL_BODY;
  const tracked = locked ? globalThis.NEAREST_BODIES[locked.id] : undefined;

  return tracked ? tracked.size + FOCUS_KEEP_OUT_MARGIN : 0;
};

export type DrawPropsType = {
  space: CanvasRenderingContext2D;
  stars: StarsType;
  moons: MoonsType;
  galaxies: GalaxiesType;
  planets: PlanetsType;
  asteroids: AsteroidsType;
  comets: CometsType;
  scale: ValueInterface;
  referenceX: number;
  referenceY: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetX: ValueInterface;
  offsetY: ValueInterface;
};

/**
 * **Draws the entire celestial simulation** onto the canvas.
 *
 * **Functionality:**
 * - Clears the canvas and renders the **background**.
 * - Initializes and draws the **starfield**.
 * - Centers the viewport on a locked celestial body (if any).
 * - Draws **galaxies, stars, planets, moons, asteroids, and comets** based on zoom level.
 * - Dynamically toggles **orbits, labels, and directional arrows**.
 *
 * **Render Layers (Ordered):**
 * 1. **Background & Starfield**
 * 2. **Galaxy & Labels**
 * 3. **Stars & Orbits**
 * 4. **Planets, Asteroid Belts & Asteroids**
 * 5. **Comets & Moons**
 * 6. **Labels & Directional Arrows**
 *
 * @param {DrawPropsType} props - Rendering properties including celestial bodies, scaling, and offsets.
 * @returns {Promise<void>} Asynchronous function to handle initialization.
 *
 * @example
 * ```ts
 * await draw({
 *   space: ctx,
 *   stars,
 *   moons,
 *   galaxies,
 *   planets,
 *   asteroids,
 *   comets,
 *   scale: { value: 50 },
 *   referenceX: 500,
 *   referenceY: 500,
 *   canvasWidth: 1024,
 *   canvasHeight: 768,
 *   offsetX: { value: 0 },
 *   offsetY: { value: 0 }
 * });
 * ```
 */
export const draw = async (props: DrawPropsType) => {
  const {
    space,
    stars,
    moons,
    asteroids,
    planets,
    galaxies,
    comets,
    scale,
    referenceX,
    referenceY,
    offsetX,
    offsetY,
    canvasWidth,
    canvasHeight
  } = props;

  // Clear the canvas for each update
  // The canvas stays transparent so the blueprint grid on the page shows through
  space.clearRect(0, 0, canvasWidth, canvasHeight);

  if (OPTIONS_UI.starfield) {
    await initializeStarfield(canvasWidth, canvasHeight, scale);
    drawStarfield(space, canvasWidth, canvasHeight);
  }

  // Only track the bodies drawn in this frame, so hidden ones don't linger
  globalThis.NEAREST_BODIES = {};

  if (globalThis.LOCKED_CELESTIAL_BODY !== null) {
    const { x, y } = getBodyPosition(globalThis.LOCKED_CELESTIAL_BODY);

    if (x && y) {
      const xPX = distanceToPixels(x, scale);
      const yPX = distanceToPixels(y, scale);
      const { parentOffsetX, parentOffsetY } = getParentBodyOffset(
        globalThis.LOCKED_CELESTIAL_BODY.parent,
        scale
      );

      // Adjust offsets to center the locked body in the viewport
      offsetX.value = normalizeParentOffset(xPX, parentOffsetX);
      offsetY.value = normalizeParentOffset(yPX, parentOffsetY);
    }
  }

  const galacticReferenceX = canvasWidth / 2 + offsetX.value;
  const galacticReferenceY = canvasHeight / 2 + offsetY.value;
  // Stars and star systems can be nested (e.g. Alpha Centauri A → Alpha Centauri AB → Alpha Centauri),
  // so each one is drawn relative to the position of its parent
  const getParentReference = (body: OrbitingBodyType) => {
    const { parentOffsetX, parentOffsetY } = getParentBodyOffset(
      body.parent,
      scale
    );

    return {
      referenceX: galacticReferenceX + parentOffsetX,
      referenceY: galacticReferenceY + parentOffsetY
    };
  };
  const sun = stars.find((star) => star.id === 'sun'); // Find the Sun
  /** Every body label that could be drawn, placed together once the bodies are */
  const labels: LabelCandidateType[] = [];

  // draw galaxy center
  drawGalaxy({
    galaxy: galaxies[0],
    scale,
    referenceX,
    referenceY,
    space,
    maxSize: MAX_CELESTIAL_BODY_SIZE
  });

  drawGalaxyLabel({
    scale,
    space,
    referenceX,
    referenceY,
    galaxy: galaxies[0]
  });

  // Draw star system and star orbits if toggled on
  [...SYSTEMS, ...stars].forEach((body) => {
    drawOrbits({
      celestialBodies: [body],
      toggled: OPTIONS_UI.trajectory,
      space,
      ...getParentReference(body),
      scale
    });
  });

  if (sun) {
    const sunPosition = getAbsolutePosition(sun);

    if (sunPosition.x && sunPosition.y) {
      const sunXPX = distanceToPixels(sunPosition.x, scale);
      const sunYPX = distanceToPixels(sunPosition.y, scale);
      const sunReferenceX = galacticReferenceX + sunXPX;
      const sunReferenceY = galacticReferenceY + sunYPX;

      if (
        scale.value > THRESHOLD_ASTEROID_BELT_RENDER &&
        OPTIONS_UI.asteroidBelts
      ) {
        drawBelts({
          space,
          centerX: sunReferenceX,
          centerY: sunReferenceY,
          scale,
          asteroidBelts: ASTEROID_BELTS
        });
      }

      // Asteroids are a layer of their own, drawn with or without the belts
      if (scale.value > THRESHOLD_ASTEROID_RENDER && OPTIONS_UI.asteroids) {
        drawOrbits({
          celestialBodies: asteroids,
          toggled: OPTIONS_UI.trajectory,
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale
        });

        drawCelestialBodies({
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale,
          celestialBodies: asteroids,
          maxSize: MAX_PLANET_SIZE
        });

        if (scale.value > THRESHOLD_PLANET_RENDER && OPTIONS_UI.labels) {
          labels.push(
            ...getLabelCandidates({
              celestialBodies: asteroids,
              scale,
              referenceX: sunReferenceX,
              referenceY: sunReferenceY
            })
          );
        }
      }

      if (scale.value > THRESHOLD_COMET_RENDER && OPTIONS_UI.comets) {
        drawOrbits({
          celestialBodies: comets,
          toggled: OPTIONS_UI.trajectory,
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale
        });

        // Draw comets
        drawCelestialBodies({
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale,
          celestialBodies: comets,
          maxSize: MAX_PLANET_SIZE
        });

        if (scale.value > THRESHOLD_COMET_LABEL && OPTIONS_UI.labels) {
          labels.push(
            ...getLabelCandidates({
              celestialBodies: comets,
              scale,
              referenceX: sunReferenceX,
              referenceY: sunReferenceY
            })
          );
        }
      }

      if (scale.value > THRESHOLD_PLANET_RENDER) {
        drawOrbits({
          celestialBodies: planets,
          toggled: OPTIONS_UI.trajectory,
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale
        });

        if (scale.value > THRESHOLD_PLANET_LABEL && OPTIONS_UI.labels) {
          labels.push(
            ...getLabelCandidates({
              celestialBodies: planets,
              scale,
              referenceX: sunReferenceX,
              referenceY: sunReferenceY
            })
          );
        }

        // Draw planets
        drawCelestialBodies({
          space,
          referenceX: sunReferenceX,
          referenceY: sunReferenceY,
          scale,
          celestialBodies: planets,
          maxSize: MAX_PLANET_SIZE
        });
      }

      planets.forEach((planet) => {
        if (OPTIONS_UI.moons) {
          const planetPosition = getBodyPosition(planet);

          if (planetPosition.x && planetPosition.y) {
            const planetXPX = distanceToPixels(planetPosition.x, scale);
            const planetYPX = distanceToPixels(planetPosition.y, scale);
            const planetReferenceX = sunReferenceX + planetXPX;
            const planetReferenceY = sunReferenceY + planetYPX;
            const planetMoons = moons.filter(
              (moon) => moon.parent === planet.id
            );

            if (scale.value > THRESHOLD_MOON_RENDER && OPTIONS_UI.labels) {
              labels.push(
                ...getLabelCandidates({
                  celestialBodies: planetMoons,
                  scale,
                  referenceX: planetReferenceX,
                  referenceY: planetReferenceY
                })
              );
            }

            if (scale.value > THRESHOLD_MOON_RENDER) {
              drawOrbits({
                celestialBodies: planetMoons,
                toggled: OPTIONS_UI.trajectory,
                space,
                referenceX: planetReferenceX,
                referenceY: planetReferenceY,
                scale
              });

              // Draw moons for this planet
              drawCelestialBodies({
                space,
                referenceX: planetReferenceX,
                referenceY: planetReferenceY,
                scale,
                celestialBodies: planetMoons,
                maxSize: MAX_MOON_SIZE
              });
            }
          }
        }
      });
    }
  }

  if (OPTIONS_UI.labels) {
    stars.forEach((star) => {
      labels.push(
        ...getLabelCandidates({
          celestialBodies: [star],
          scale,
          ...getParentReference(star)
        })
      );
    });
  }

  // Draw stars
  stars.forEach((star) => {
    drawCelestialBodies({
      space,
      scale,
      ...getParentReference(star),
      celestialBodies: [star],
      maxSize: MAX_STAR_SIZE
    });
  });

  // Every label at once, over the bodies, so none overlaps another (#91)
  drawLabels({ space, labels });

  // Mark the body the camera is locked on
  drawLockReticle(space);

  // Draw arrows towards the nearest off-screen bodies drawn in this frame
  if (OPTIONS_UI.arrowHeads) {
    drawDirectionalArrows({
      space,
      canvasWidth,
      canvasHeight,
      obstacles: getHudObstacles(space.canvas, canvasWidth),
      keepOutRadius: getFocusKeepOut()
    });
  }
};
