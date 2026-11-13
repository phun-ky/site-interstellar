import { AU_PER_LY, STARS, TWO_PI } from '@interstellar-tools/constants';

import { CANVAS_COLORS, CANVAS_LABEL_FONT } from '../canvas/config/ui';
import { GALAXY_BODIES } from '../celestial-bodies/utils/body-catalog';
import { getAbsolutePosition } from '../celestial-bodies/utils/get-absolute-position';

import {
  type MapPointType,
  MILKY_WAY_RADIUS_AU
} from './utils/get-minimap-context';
import {
  FILL,
  getNeighbourReach,
  toGalaxyMap,
  toNeighbourMap
} from './utils/minimap-projection';

const DISC = 'rgba(71, 184, 190, 0.16)';
const RING = 'rgba(71, 184, 190, 0.35)';
/** The Sun's orbit round the Milky Way's centre, in au. */
const SUN_ORBIT_AU = 27_000 * AU_PER_LY;

/** Below this size, in pixels, the minimap has no room for names. */
export const MIN_LABEL_SIZE = 120;

/** Sizes the canvas to its CSS size at the screen's pixel density. */
const prepare = (
  canvas: HTMLCanvasElement
): { space: CanvasRenderingContext2D; size: number } | null => {
  const dpr = globalThis.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  const space = canvas.getContext('2d');

  if (!size || !space) return null;

  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }

  space.setTransform(dpr, 0, 0, dpr, 0, 0);
  space.clearRect(0, 0, size, size);

  return { space, size };
};
/** A marked point: an amber ring, and its name on the side facing the middle. */
const mark = (
  space: CanvasRenderingContext2D,
  { x, y }: MapPointType,
  size: number,
  name: string | null
): void => {
  space.strokeStyle = CANVAS_COLORS.amber;
  space.lineWidth = 1.5;
  space.beginPath();
  space.arc(x, y, 6, 0, TWO_PI);
  space.stroke();

  if (!name || size < MIN_LABEL_SIZE) return;

  const toRight = x < size / 2;

  space.font = CANVAS_LABEL_FONT;
  space.textBaseline = 'middle';
  space.textAlign = toRight ? 'left' : 'right';
  space.fillStyle = CANVAS_COLORS.amber;
  space.fillText(name.toUpperCase(), x + (toRight ? 10 : -10), y);
};

/**
 * Draws the Milky Way on the minimap (#117): its disc, the Sun's orbit round
 * its centre, Sagittarius A* and the stars, and a marker where the map is.
 *
 * @param {HTMLCanvasElement} canvas - The minimap's canvas, sized by CSS.
 * @param {MapPointType} marker - Where the map is, from the Milky Way's centre, in au.
 * @param {string | null} name - What is there, to name it, or `null`.
 *
 * @example
 * ```ts
 * drawGalaxyMap(canvas, sunPosition, 'Sun');
 * ```
 */
export const drawGalaxyMap = (
  canvas: HTMLCanvasElement,
  marker: MapPointType,
  name: string | null
): void => {
  const prepared = prepare(canvas);

  if (!prepared) return;

  const { space, size } = prepared;
  const mid = size / 2;
  const disc = mid * FILL;
  const glow = space.createRadialGradient(mid, mid, 0, mid, mid, disc);

  glow.addColorStop(0, DISC);
  glow.addColorStop(1, 'transparent');
  space.fillStyle = glow;
  space.beginPath();
  space.arc(mid, mid, disc, 0, TWO_PI);
  space.fill();

  space.strokeStyle = RING;
  space.lineWidth = 1;
  space.setLineDash([2, 3]);
  space.beginPath();
  space.arc(mid, mid, disc * (SUN_ORBIT_AU / MILKY_WAY_RADIUS_AU), 0, TWO_PI);
  space.stroke();
  space.setLineDash([]);

  // The stars, most of them near the Sun
  space.fillStyle = CANVAS_COLORS.text;
  STARS.forEach((star) => {
    const { x, y } = getAbsolutePosition(star);
    const at = toGalaxyMap({ x: x.value, y: y.value }, size);

    space.fillRect(at.x - 0.75, at.y - 0.75, 1.5, 1.5);
  });

  // Sagittarius A*, in the middle
  space.fillStyle = '#ffffff';
  space.beginPath();
  space.arc(mid, mid, 2.5, 0, TWO_PI);
  space.fill();

  mark(space, toGalaxyMap(marker, size), size, name);
};

/**
 * Draws the Milky Way among its neighbouring galaxies on the minimap (#117):
 * each in its direction, at a distance on a log scale, with one marked.
 *
 * @param {HTMLCanvasElement} canvas - The minimap's canvas, sized by CSS.
 * @param {string} focusId - The galaxy to mark: `milky-way`, or a neighbour.
 *
 * @example
 * ```ts
 * drawNeighboursMap(canvas, 'andromeda');
 * ```
 */
export const drawNeighboursMap = (
  canvas: HTMLCanvasElement,
  focusId: string
): void => {
  const prepared = prepare(canvas);

  if (!prepared) return;

  const { space, size } = prepared;
  const mid = size / 2;
  const reach = getNeighbourReach();

  // Rings at the nearest and farthest neighbour's distance
  space.strokeStyle = RING;
  space.lineWidth = 1;
  space.setLineDash([2, 3]);
  [mid * 0.32, mid * FILL].forEach((radius) => {
    space.beginPath();
    space.arc(mid, mid, radius, 0, TWO_PI);
    space.stroke();
  });
  space.setLineDash([]);

  // The Milky Way, in the middle
  const glow = space.createRadialGradient(mid, mid, 0, mid, mid, 10);

  glow.addColorStop(0, CANVAS_COLORS.teal);
  glow.addColorStop(1, 'transparent');
  space.fillStyle = glow;
  space.beginPath();
  space.arc(mid, mid, 10, 0, TWO_PI);
  space.fill();

  let focus: { at: MapPointType; name: string } | null =
    focusId === 'milky-way'
      ? { at: { x: mid, y: mid }, name: 'Milky Way' }
      : null;

  GALAXY_BODIES.forEach((galaxy) => {
    const at = toNeighbourMap(
      { x: galaxy.position.x.value, y: galaxy.position.y.value },
      size,
      reach
    );

    space.fillStyle = galaxy.display.color;
    space.beginPath();
    space.arc(at.x, at.y, 2.5, 0, TWO_PI);
    space.fill();

    if (galaxy.id === focusId) focus = { at, name: galaxy.name };
  });

  if (focus) {
    const { at, name } = focus;

    mark(space, at, size, name);
  }
};
