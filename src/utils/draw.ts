import { ASTEROID_BELTS, SYSTEMS } from '@interstellar-tools/constants';
import {
  AsteroidsType,
  CelestialBodyType,
  CometsType,
  GalaxiesType,
  InterstellarObjectsType,
  MoonsType,
  PlanetsType,
  StarsType,
  ValueInterface
} from '@interstellar-tools/types';

import {
  MIN_BLACK_HOLE_SIZE,
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
import { drawGalaxies } from '../features/celestial-bodies/draw-galaxies';
import { drawGalaxy } from '../features/celestial-bodies/draw-galaxy';
import { drawLockReticle } from '../features/celestial-bodies/draw-lock-reticle';
import { drawStars } from '../features/celestial-bodies/draw-stars';
import { drawOrbits } from '../features/celestial-bodies/orbits/draw';
import {
  GALAXY_BODIES,
  getBodyKind
} from '../features/celestial-bodies/utils/body-catalog';
import { getBodyPosition } from '../features/celestial-bodies/utils/get-body-position';
import { drawLabels, getLabelCandidates } from '../features/labels/draw';
import { drawGalaxyLabel } from '../features/labels/draw-galaxy-label';
import { type LabelCandidateType } from '../features/labels/utils/place-labels';
import { drawStarfield } from '../features/starfield/draw-starfield';
import { initializeStarfield } from '../features/starfield/initialize-starfield';
import { drawFocusOverlay, getFocusShift } from '../features/ui/focus-state';
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
/** How wide a star's orbit round a black hole must be drawn before the star is, in pixels. */
const MIN_BLACK_HOLE_ORBIT_PX = 8;

export type DrawPropsType = {
  space: CanvasRenderingContext2D;
  stars: StarsType;
  moons: MoonsType;
  galaxies: GalaxiesType;
  planets: PlanetsType;
  asteroids: AsteroidsType;
  comets: CometsType;
  /** The interstellar objects, on open orbits round the Sun (#105). */
  interstellarObjects: InterstellarObjectsType;
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
    interstellarObjects,
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

      // In the focus view, the body sits in the space the info panel leaves
      const shift = getFocusShift();

      offsetX.value += shift.x;
      offsetY.value += shift.y;
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
  const blackHoles = new Set(galaxies.map(({ blackHole }) => blackHole?.id));
  /**
   * The stars to draw: stars orbiting a black hole (the S-stars round
   * Sagittarius A*) only once their orbit is wide enough to tell them apart
   * from it, as moons are only drawn close up.
   */
  const shownStars = stars.filter(
    ({ parent, orbit }) =>
      !orbit ||
      !blackHoles.has(parent) ||
      distanceToPixels(orbit.a, scale) >= MIN_BLACK_HOLE_ORBIT_PX
  );
  /** Every body label that could be drawn, placed together once the bodies are */
  const labels: LabelCandidateType[] = [];

  // draw galaxy center
  drawGalaxy({
    galaxy: galaxies[0],
    scale,
    referenceX,
    referenceY,
    space,
    minSize: MIN_BLACK_HOLE_SIZE
  });

  const galaxyLabelBoxes = drawGalaxyLabel({
    scale,
    space,
    referenceX,
    referenceY,
    galaxy: galaxies[0]
  });
  // The other galaxies, round the Milky Way (#105)
  const galaxyLabels = drawGalaxies({
    space,
    referenceX: galacticReferenceX,
    referenceY: galacticReferenceY,
    scale,
    galaxies: GALAXY_BODIES
  });

  if (OPTIONS_UI.labels) labels.push(...galaxyLabels);

  // Draw star system and star orbits if toggled on
  [...SYSTEMS, ...shownStars].forEach((body) => {
    drawOrbits({
      celestialBodies: [body],
      toggled: OPTIONS_UI.trajectory,
      space,
      ...getParentReference(body),
      scale
    });
  });

  /**
   * Draws a layer of bodies (planets, asteroids, comets or moons) round their
   * parents: each group of siblings at its parent's position, so planets
   * circle their own star (TRAPPIST-1's round TRAPPIST-1A) and moons their
   * own planet or asteroid (Dimorphos round Didymos).
   */
  const drawLayer = (
    bodies: OrbitingBodyType[],
    { labelled }: { labelled: boolean }
  ) => {
    const byParent = new Map<string | undefined, OrbitingBodyType[]>();

    for (const body of bodies) {
      byParent.set(body.parent, [...(byParent.get(body.parent) ?? []), body]);
    }

    byParent.forEach((siblings) => {
      const reference = getParentReference(siblings[0]);
      const celestialBodies = siblings as CelestialBodyType[];

      drawOrbits({
        celestialBodies,
        toggled: OPTIONS_UI.trajectory,
        space,
        ...reference,
        scale
      });
      drawCelestialBodies({
        space,
        ...reference,
        scale,
        celestialBodies
      });

      if (labelled) {
        labels.push(
          ...getLabelCandidates({ celestialBodies, scale, ...reference })
        );
      }
    });
  };
  const showAsteroids =
    scale.value > THRESHOLD_ASTEROID_RENDER && OPTIONS_UI.asteroids;

  if (
    sun &&
    scale.value > THRESHOLD_ASTEROID_BELT_RENDER &&
    OPTIONS_UI.asteroidBelts
  ) {
    const { referenceX: centerX, referenceY: centerY } = getParentReference({
      parent: sun.id
    } as OrbitingBodyType);

    drawBelts({
      space,
      centerX,
      centerY,
      scale,
      asteroidBelts: ASTEROID_BELTS
    });
  }

  // Asteroids are a layer of their own, drawn with or without the belts
  if (showAsteroids) {
    drawLayer(asteroids, {
      labelled: scale.value > THRESHOLD_PLANET_RENDER && OPTIONS_UI.labels
    });
  }

  if (scale.value > THRESHOLD_COMET_RENDER && OPTIONS_UI.comets) {
    drawLayer(comets, {
      labelled: scale.value > THRESHOLD_COMET_LABEL && OPTIONS_UI.labels
    });
  }

  // Interstellar objects pass through on hyperbolas, shown as comets are
  if (scale.value > THRESHOLD_COMET_RENDER && OPTIONS_UI.interstellar) {
    drawLayer(interstellarObjects, {
      labelled: scale.value > THRESHOLD_COMET_LABEL && OPTIONS_UI.labels
    });
  }

  if (scale.value > THRESHOLD_PLANET_RENDER) {
    drawLayer(planets, {
      labelled: scale.value > THRESHOLD_PLANET_LABEL && OPTIONS_UI.labels
    });
  }

  // Moons round planets, and round asteroids while asteroids are shown
  if (OPTIONS_UI.moons && scale.value > THRESHOLD_MOON_RENDER) {
    drawLayer(
      moons.filter(
        ({ parent }) =>
          getBodyKind(parent ?? '') !== 'asteroid' || showAsteroids
      ),
      { labelled: OPTIONS_UI.labels }
    );
  }

  // Draw stars, overlapping ones as one (#13)
  labels.push(
    ...drawStars({
      space,
      scale,
      stars: shownStars,
      referenceX: galacticReferenceX,
      referenceY: galacticReferenceY,
      labelled: OPTIONS_UI.labels
    })
  );

  const focused = globalThis.FOCUSED_CELESTIAL_BODY;

  // The focused body, shaded and dressed, under the labels
  drawFocusOverlay(space);

  // Every label at once, over the bodies, so none overlaps another (#91).
  // The focused body is named in its panel, so it has none
  drawLabels({
    space,
    labels: focused ? labels.filter(({ id }) => id !== focused.id) : labels,
    obstacles: galaxyLabelBoxes
  });

  // Mark the body the camera is locked on
  if (!focused) drawLockReticle(space);

  // Draw arrows towards the nearest off-screen bodies drawn in this frame
  if (OPTIONS_UI.arrowHeads && !focused) {
    drawDirectionalArrows({
      space,
      canvasWidth,
      canvasHeight,
      obstacles: getHudObstacles(space.canvas, canvasWidth),
      keepOutRadius: getFocusKeepOut()
    });
  }
};
