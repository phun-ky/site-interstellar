import { SCALE } from '../../config/constants';
import { OrbitingBodyType } from '../../types/orbiting-bodies';
import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { offsetX, offsetY } from '../canvas/config/camera';
import { getViewportSize } from '../canvas/get-viewport-size';
import { getAbsolutePosition } from '../celestial-bodies/utils/get-absolute-position';
import { isFocusView } from '../ui/focus-state';

import { drawGalaxyMap, drawNeighboursMap } from './draw-galaxy-map';
import { drawSystemMap } from './draw-system-map';
import {
  getMinimapContext,
  type MapPointType,
  type MinimapContextType
} from './utils/get-minimap-context';

/** The minimap's own canvas, apart from the one the focus view puts there. */
const CANVAS_CLASS = 'mc-minimap-canvas';
/** The minimap's canvas, made, or put back after the focus view, as needed. */
const getCanvas = (): HTMLCanvasElement | null => {
  const minimap = document.getElementById('minimap');

  if (!minimap) return null;

  const current = minimap.firstElementChild;

  if (
    current instanceof HTMLCanvasElement &&
    current.classList.contains(CANVAS_CLASS)
  ) {
    return current;
  }

  const canvas = document.createElement('canvas');

  canvas.className = `int ${CANVAS_CLASS}`;
  minimap.replaceChildren(canvas);

  return canvas;
};
/** Where a body is, from the Milky Way's centre, in au. */
const toMapPoint = (body: OrbitingBodyType): MapPointType => {
  const { x, y } = getAbsolutePosition(body);

  return { x: x.value, y: y.value };
};
/** What the map shows now: what is locked, and how much of space, in au. */
const getView = () => {
  const map = document.getElementById(
    'spaceCanvas'
  ) as HTMLCanvasElement | null;
  const { width } = map
    ? getViewportSize(map)
    : { width: globalThis.innerWidth };
  // Pixels per au at this scale
  const perAu = distanceToPixels({ value: 1, unit: 'au' }, SCALE);
  const locked = globalThis.LOCKED_CELESTIAL_BODY as OrbitingBodyType | null;

  return {
    locked,
    halfWidthAu: width / 2 / perAu,
    // The Milky Way's centre is drawn at the middle plus the offset
    centreAu: { x: -offsetX.value / perAu, y: -offsetY.value / perAu },
    lockedAu: locked ? toMapPoint(locked) : undefined
  };
};
/** Draws a context on the minimap's canvas, and names it on the minimap (`data-view`). */
const draw = (canvas: HTMLCanvasElement, context: MinimapContextType): void => {
  canvas.parentElement?.setAttribute('data-view', context.kind);

  if (context.kind === 'system') {
    drawSystemMap(canvas, context.system);
  } else if (context.kind === 'galaxy') {
    drawGalaxyMap(canvas, context.marker, context.name);
  } else {
    drawNeighboursMap(canvas, context.focusId);
  }
};

/**
 * Updates the minimap (#117) to show one level up from what the map shows
 * (see `getMinimapContext`): the locked body's system, the Milky Way with a
 * marker where the map is, or the Milky Way among its neighbours.
 *
 * While the focus view is open it draws its own system map there, so this
 * leaves the minimap alone, but for a body with no system, which it shows
 * in the Milky Way when given.
 *
 * @param {OrbitingBodyType} [body] - A body to mark in the Milky Way, for the focus view.
 *
 * @example
 * ```ts
 * updateMinimap(); // every few frames
 * updateMinimap(betelgeuse); // the focus view, for a star with no planets
 * ```
 */
export const updateMinimap = (body?: OrbitingBodyType): void => {
  if (isFocusView() && !body) return;

  const canvas = getCanvas();

  if (!canvas) return;

  if (body) {
    drawGalaxyMap(canvas, toMapPoint(body), body.name);

    return;
  }

  draw(canvas, getMinimapContext(getView()));
};
