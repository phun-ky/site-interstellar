import { OPTIONS_UI } from '../canvas/config/hud';

import { ArrowLabelBoxType, drawArrow } from './utils/draw-arrow';
import { getAngleToViewport } from './utils/get-angle-to-viewport';
import { ArrowBoundsType, getArrowPosition } from './utils/get-arrow-position';
import { isOffScreen } from './utils/is-off-screen';

/** Arrows closer than this (in pixels) along the viewport edge are merged into one. */
const ARROW_MERGE_DISTANCE = 32;

export type DrawDirectionalArrowsPropsType = {
  space: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  /** How many of the nearest off-screen objects get an arrow. Defaults to `OPTIONS_UI.arrowHeadsCount`. */
  count?: number;
  /** HUD panels over the canvas. Bodies behind one count as off screen, arrows stop outside them, and labels avoid them. */
  obstacles?: ArrowBoundsType[];
  /** Distance from the centre, in pixels, arrows never stop within: the focused body's radius plus a margin. */
  keepOutRadius?: number;
};

/**
 * How many lines each arrow label was moved in the last frame, by the name of
 * the body it is labelled with.
 */
let previousNudges = new Map<string, number>();

/**
 * Forgets where the arrow labels were drawn, so the next frame places them
 * afresh. For tests.
 */
export const forgetArrowLabels = (): void => {
  previousNudges = new Map();
};

type ArrowGroupType = {
  angle: number;
  x: number;
  y: number;
  names: string[];
};

/**
 * Draws directional arrows towards the nearest celestial bodies that are off-screen.
 *
 * The candidates are the bodies drawn in the current frame (`globalThis.NEAREST_BODIES`),
 * so hidden bodies (e.g. moons when zoomed out, or comets when toggled off) are left out.
 * Off-screen bodies are sorted by their distance from the **center of the viewport**,
 * and the nearest `count` of them get an arrow at the viewport edge pointing towards them.
 *
 * Bodies in (almost) the same direction, like the stars of a multiple star system,
 * share one arrow, labelled with the nearest body's name and how many more it covers
 * (e.g. `Alpha Centauri A +2`). Labels that would overlap are moved apart.
 *
 * Which label moves aside is remembered from frame to frame: labels that were
 * not moved in the last frame are placed first, nearest body first, and moved
 * labels after them. Without that, two labels whose bodies are about as far
 * away take turns being moved as the nearer one changes, and jump back and
 * forth. A moved label stays on its line while that is free, and goes back as
 * soon as its own place is. For the same reason, a merged arrow keeps the body
 * it was named after in the last frame while that body is still in it.
 *
 * @param {DrawDirectionalArrowsPropsType} props - The properties required for drawing arrows.
 * @returns {void}
 *
 * @example
 * ```ts
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement;
 * const ctx = canvas.getContext('2d');
 * if (ctx) {
 *   drawDirectionalArrows({
 *     space: ctx,
 *     canvasWidth: canvas.width,
 *     canvasHeight: canvas.height,
 *     count: 10
 *   });
 * }
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
 */
export const drawDirectionalArrows = (
  props: DrawDirectionalArrowsPropsType
): void => {
  const {
    space,
    canvasWidth,
    canvasHeight,
    count = OPTIONS_UI.arrowHeadsCount,
    obstacles = [],
    keepOutRadius = 0
  } = props;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const nearest = Object.values(globalThis.NEAREST_BODIES)
    .filter(
      ({ x, y }) =>
        isOffScreen(x, y, canvasWidth, canvasHeight) ||
        obstacles.some(
          (o) => x >= o.left && x <= o.right && y >= o.top && y <= o.bottom
        )
    )
    .map(({ x, y, name }) => ({
      name,
      distance: Math.hypot(x - centerX, y - centerY),
      angle: getAngleToViewport(x, y, centerX, centerY)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(0, count));
  // Merge arrows that would overlap at the viewport edge, nearest body first
  const groups: ArrowGroupType[] = [];

  nearest.forEach(({ name, angle }) => {
    const { x, y } = getArrowPosition(
      angle,
      canvasWidth,
      canvasHeight,
      obstacles,
      keepOutRadius
    );
    const group = groups.find(
      (g) => Math.hypot(g.x - x, g.y - y) < ARROW_MERGE_DISTANCE
    );

    if (group) group.names.push(name);
    else groups.push({ angle, x, y, names: [name] });
  });

  // A merged arrow stays named after, and pointed at, the body it was in the
  // last frame, so it doesn't switch between bodies about as far away
  const angles = new Map(nearest.map(({ name, angle }) => [name, angle]));

  groups.forEach((group) => {
    const kept = group.names.find((name) => previousNudges.has(name));

    if (kept && kept !== group.names[0]) {
      group.names = [kept, ...group.names.filter((name) => name !== kept)];
      group.angle = angles.get(kept) ?? group.angle;
    }
  });

  // Panels count as taken, so labels are nudged away from them
  const occupiedLabels: ArrowLabelBoxType[] = obstacles.map((o) => ({ ...o }));
  const nudgedBefore = ({ names: [first] }: ArrowGroupType) =>
    previousNudges.get(first) ?? 0;
  const nudges = new Map<string, number>();

  space.save();

  // A stable sort, so labels moved by as much keep the nearest-first order
  groups
    .toSorted((a, b) => nudgedBefore(a) - nudgedBefore(b))
    .forEach((group) => {
      const { angle, names } = group;
      const [first, ...rest] = names;
      const label = rest.length ? `${first} +${rest.length}` : first;

      nudges.set(
        first,
        drawArrow(
          space,
          angle,
          canvasWidth,
          canvasHeight,
          label,
          occupiedLabels,
          obstacles,
          keepOutRadius,
          nudgedBefore(group)
        )
      );
    });

  space.restore();
  previousNudges = nudges;
};
