import { TWO_PI } from '@interstellar-tools/constants';

import { CANVAS_COLORS, CANVAS_LABEL_FONT } from '../canvas/config/ui';
import { getBodyPosition } from '../celestial-bodies/utils/get-body-position';

import { getOrbitSize, type SystemMapType } from './utils/get-system-map';

const GRID = 'rgba(71, 184, 190, 0.12)';
const TICKS = 'rgba(71, 184, 190, 0.45)';
const RING = 'rgba(71, 184, 190, 0.35)';
/** A nav grid behind the map: eight cells a side, with ticks round the edge. */
const drawGrid = (space: CanvasRenderingContext2D, size: number): void => {
  const step = size / 8;

  space.lineWidth = 1;
  space.strokeStyle = GRID;
  space.beginPath();

  for (let i = 1; i < 8; i++) {
    space.moveTo(i * step, 0);
    space.lineTo(i * step, size);
    space.moveTo(0, i * step);
    space.lineTo(size, i * step);
  }

  space.stroke();
  space.strokeStyle = TICKS;
  space.beginPath();

  for (let i = 0; i <= 32; i++) {
    const at = (i * size) / 32;
    const long = i % 4 === 0 ? 8 : 4;

    space.moveTo(at, 0);
    space.lineTo(at, long);
    space.moveTo(at, size);
    space.lineTo(at, size - long);
    space.moveTo(0, at);
    space.lineTo(long, at);
    space.moveTo(size, at);
    space.lineTo(size - long, at);
  }

  space.stroke();
};

/**
 * Draws a body in its system on the minimap, over a nav grid: the centre, a
 * ring per orbit (spaced by the log of its size, so Mercury and Neptune both
 * fit) and each body where it is on it now. The focused body and its ring
 * are picked out and named in amber.
 *
 * @param {HTMLCanvasElement} canvas - The minimap canvas, sized by CSS.
 * @param {SystemMapType} system - What to draw (see `getSystemMap()`).
 *
 * @example
 * ```ts
 * const system = getSystemMap(earth);
 *
 * if (system) drawSystemMap(canvas, system);
 * ```
 */
export const drawSystemMap = (
  canvas: HTMLCanvasElement,
  system: SystemMapType
): void => {
  const dpr = globalThis.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  const space = canvas.getContext('2d');

  if (!size || !space) return;

  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }

  space.setTransform(dpr, 0, 0, dpr, 0, 0);
  space.clearRect(0, 0, size, size);
  drawGrid(space, size);

  const { centre, rings, focus } = system;
  const mid = size / 2;
  const inner = size * 0.12;
  const outer = size * 0.44;
  const sizes = rings.map(getOrbitSize).filter((au) => au > 0);
  const min = Math.log(Math.min(...sizes));
  const max = Math.log(Math.max(...sizes));
  const toRadius = (au: number): number =>
    max - min < 1e-9
      ? (inner + outer) / 2
      : inner + ((Math.log(au) - min) / (max - min)) * (outer - inner);
  const placed = rings.map((ring) => {
    const radius = toRadius(getOrbitSize(ring));
    const isFocus = ring.id === focus.id;
    const { x, y } = getBodyPosition(ring);
    const angle = Math.atan2(y.value, x.value);

    space.strokeStyle = isFocus ? CANVAS_COLORS.amber : RING;
    space.lineWidth = isFocus ? 1.5 : 1;
    space.setLineDash(isFocus ? [] : [2, 3]);
    space.beginPath();
    space.arc(mid, mid, radius, 0, TWO_PI);
    space.stroke();
    space.setLineDash([]);

    return {
      x: mid + Math.cos(angle) * radius,
      y: mid + Math.sin(angle) * radius,
      body: ring,
      isFocus
    };
  });
  // The centre, glowing
  const color =
    ('display' in centre && centre.display?.color) || CANVAS_COLORS.text;
  const glow = space.createRadialGradient(mid, mid, 2, mid, mid, 14);

  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  space.fillStyle = glow;
  space.beginPath();
  space.arc(mid, mid, 14, 0, TWO_PI);
  space.fill();
  space.fillStyle = color;
  space.beginPath();
  space.arc(mid, mid, 4.5, 0, TWO_PI);
  space.fill();

  // The bodies, the focused one last so it is on top
  const marked = [
    ...placed.filter(({ isFocus }) => !isFocus),
    ...placed.filter(({ isFocus }) => isFocus),
    ...(centre.id === focus.id
      ? [{ x: mid, y: mid, body: centre, isFocus: true }]
      : [])
  ];

  space.font = CANVAS_LABEL_FONT;
  space.textBaseline = 'middle';
  marked.forEach(({ x, y, body, isFocus }) => {
    if (body.id !== centre.id) {
      space.fillStyle =
        ('display' in body && body.display?.color) || CANVAS_COLORS.text;
      space.beginPath();
      space.arc(x, y, isFocus ? 4.5 : 2.5, 0, TWO_PI);
      space.fill();
    }

    if (!isFocus) return;

    // A ring round it, and its name on the side facing the middle
    const toRight = x < mid + outer * 0.5;

    space.strokeStyle = CANVAS_COLORS.amber;
    space.lineWidth = 1.5;
    space.beginPath();
    space.arc(x, y, 9, 0, TWO_PI);
    space.stroke();
    space.fillStyle = CANVAS_COLORS.amber;
    space.textAlign = toRight ? 'left' : 'right';
    space.fillText(body.name.toUpperCase(), x + (toRight ? 14 : -14), y);
  });
};
