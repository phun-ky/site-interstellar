import { TWO_PI } from '@interstellar-tools/constants';

import { OrbitingBodyType } from '../../types/orbiting-bodies';
import { prefersReducedMotion } from '../../utils/prefers-reduced-motion';
import { CANVAS_COLORS, CANVAS_LABEL_FONT } from '../canvas/config/ui';

import { findBodyById, getBodyKind } from './utils/body-catalog';
import { getAbsolutePosition } from './utils/get-absolute-position';
import { getOrbitState } from './utils/get-orbit-state';

/** Below this drawn radius, in pixels, the body is too small to dress up. */
const MIN_RADIUS = 12;
/** The direction of the star a body is lit by, as an angle on the canvas. */
const getLightAngle = (body: OrbitingBodyType): number | null => {
  let star = findBodyById(body.parent);

  while (star && getBodyKind(star.id) !== 'star')
    star = findBodyById(star.parent);

  if (!star) return null;

  const from = getAbsolutePosition(body);
  const to = getAbsolutePosition(star);

  return Math.atan2(to.y.value - from.y.value, to.x.value - from.x.value);
};
/**
 * A day side and a night side, lit from the body's star: a terminator across
 * the disc, darkening towards the limb.
 */
const drawShading = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number
): void => {
  const dx = Math.cos(angle) * r;
  const dy = Math.sin(angle) * r;
  const night = space.createLinearGradient(x + dx, y + dy, x - dx, y - dy);

  night.addColorStop(0, 'rgba(5, 8, 7, 0)');
  night.addColorStop(0.42, 'rgba(5, 8, 7, 0.05)');
  night.addColorStop(0.62, 'rgba(5, 8, 7, 0.82)');
  night.addColorStop(1, 'rgba(5, 8, 7, 0.94)');

  const limb = space.createRadialGradient(
    x + dx * 0.35,
    y + dy * 0.35,
    0,
    x,
    y,
    r
  );

  limb.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  limb.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  limb.addColorStop(0.9, 'rgba(5, 8, 7, 0.25)');
  limb.addColorStop(1, 'rgba(5, 8, 7, 0.55)');
  space.save();
  space.beginPath();
  space.arc(x, y, r, 0, TWO_PI);
  space.clip();
  space.fillStyle = limb;
  space.fillRect(x - r, y - r, r * 2, r * 2);
  space.fillStyle = night;
  space.fillRect(x - r, y - r, r * 2, r * 2);
  space.restore();
};
const TEAL_LINE = 'rgba(71, 184, 190, 0.7)';
const TEAL_FAINT = 'rgba(71, 184, 190, 0.35)';
const MUTED = 'rgba(170, 188, 198, 0.85)';
const SMALL_FONT = CANVAS_LABEL_FONT.replace('12px', '10px');
const DEG = Math.PI / 180;
/** Below this canvas width, in pixels, the HUD leaves out its tags and callouts. */
const COMPACT_WIDTH = 600;
const isCompact = (space: CanvasRenderingContext2D): boolean =>
  space.canvas.clientWidth < COMPACT_WIDTH;
/** A tag of text lines in a panel box, its corner at `x, y`, growing right or left. */
const drawTag = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  lines: { text: string; color: string }[],
  toRight: boolean
): void => {
  space.font = CANVAS_LABEL_FONT;
  space.textBaseline = 'middle';

  const width =
    Math.max(...lines.map(({ text }) => space.measureText(text).width)) + 16;
  const height = lines.length * 16 + 8;
  const left = toRight ? x : x - width;

  space.fillStyle = 'rgba(15, 23, 32, 0.9)';
  space.fillRect(left, y - height / 2, width, height);
  space.strokeStyle = TEAL_FAINT;
  space.lineWidth = 1;
  space.strokeRect(left + 0.5, y - height / 2 + 0.5, width - 1, height - 1);
  space.textAlign = 'left';
  lines.forEach(({ text, color }, index) => {
    space.fillStyle = color;
    space.fillText(text, left + 8, y - height / 2 + 12 + index * 16);
  });
};
/** Arcs round a centre: `count` of them, each `length` degrees, from `start`. */
const drawArcs = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  count: number,
  length: number,
  start: number
): void => {
  for (let i = 0; i < count; i++) {
    const a = (start + (i * 360) / count) * DEG;

    space.beginPath();
    space.arc(x, y, radius, a, a + length * DEG);
    space.stroke();
  }
};
/** How long the visor takes to power on, in milliseconds. */
const VISOR_INTRO_MS = 700;

let visorBodyId: string | null = null;
let visorOpenedAt = 0;

/** How far the visor has powered on, 0 to 1, since this body was focused. */
const getVisorProgress = (id: string): number => {
  if (id !== visorBodyId) {
    visorBodyId = id;
    visorOpenedAt = performance.now();
  }

  if (prefersReducedMotion()) return 1;

  const progress = Math.min(
    1,
    (performance.now() - visorOpenedAt) / VISOR_INTRO_MS
  );

  return 1 - (1 - progress) ** 3;
};
/** Fades a tape's marks towards its ends: 1 in the middle, 0 at the ends. */
const tapeFade = (offset: number, half: number): number =>
  Math.max(0, 1 - (Math.abs(offset) / half) ** 2);

type TapePropsType = {
  /** Where the tape's spine is, in pixels. */
  spine: number;
  /** Its middle along the spine, where the reading is. */
  middle: number;
  /** Half its length, in pixels. */
  half: number;
  /** The reading. */
  value: number;
  /** What a tick is worth, and the pixels between ticks. */
  step: number;
  perStep: number;
  /** Labelled every so many ticks. */
  labelEvery: number;
  format: (value: number) => string;
  /** The reading at the pointer, more precise than the labels. */
  readout?: (value: number) => string;
  /** Which side the ticks and labels go: 1 right or down, -1 left or up. */
  side: 1 | -1;
  vertical: boolean;
  /** Higher readings up (or right). */
  title: string;
  alpha: number;
};

/**
 * A moving scale tape, like an aircraft's speed, altitude or heading tape:
 * ticks slide past a fixed pointer as the reading changes, fading out at
 * the ends, with the reading boxed at the pointer.
 */
const drawTape = (
  space: CanvasRenderingContext2D,
  props: TapePropsType
): void => {
  const {
    spine,
    middle,
    half,
    value,
    step,
    perStep,
    labelEvery,
    format,
    readout = format,
    side,
    vertical,
    title,
    alpha
  } = props;
  const span = (half / perStep) * step;
  const first = Math.ceil((value - span) / step);
  const last = Math.floor((value + span) / step);
  // A point on the tape: along it (from the middle) and across it (from the spine)
  const at = (along: number, across: number): [number, number] =>
    vertical
      ? [spine + across, middle - along]
      : [middle + along, spine + across];

  space.save();
  space.font = SMALL_FONT;
  space.textBaseline = 'middle';
  space.textAlign = vertical ? (side > 0 ? 'left' : 'right') : 'center';
  space.lineWidth = 1;

  for (let i = first; i <= last; i++) {
    const offset = ((i * step - value) / step) * perStep;
    const fade = tapeFade(offset, half) * alpha;
    const major = i % labelEvery === 0;
    const long = major ? 10 : i % (labelEvery / 2) === 0 ? 6 : 3;

    space.globalAlpha = fade;
    space.strokeStyle = TEAL_LINE;
    space.beginPath();
    space.moveTo(...at(offset, 0));
    space.lineTo(...at(offset, side * long));
    space.stroke();

    if (major) {
      space.fillStyle = MUTED;
      space.fillText(format(i * step), ...at(offset, side * 18));
    }
  }

  // The spine, fading at both ends
  const [x0, y0] = at(-half, 0);
  const [x1, y1] = at(half, 0);
  const spineGradient = space.createLinearGradient(x0, y0, x1, y1);

  spineGradient.addColorStop(0, 'rgba(71, 184, 190, 0)');
  spineGradient.addColorStop(0.5, 'rgba(71, 184, 190, 0.6)');
  spineGradient.addColorStop(1, 'rgba(71, 184, 190, 0)');
  space.globalAlpha = alpha;
  space.strokeStyle = spineGradient;
  space.beginPath();
  space.moveTo(x0 + (vertical ? 0.5 : 0), y0 + (vertical ? 0 : 0.5));
  space.lineTo(x1 + (vertical ? 0.5 : 0), y1 + (vertical ? 0 : 0.5));
  space.stroke();

  // The title, at the tape's far end
  space.fillStyle = MUTED;
  space.textAlign = vertical ? (side > 0 ? 'left' : 'right') : 'left';
  space.fillText(title, ...(vertical ? at(half + 16, 0) : at(half + 10, -4)));

  // The pointer, and the reading boxed against it
  const [px, py] = at(0, 0);

  space.fillStyle = CANVAS_COLORS.amber;
  space.beginPath();

  if (vertical) {
    space.moveTo(px - side * 2, py);
    space.lineTo(px - side * 10, py - 6);
    space.lineTo(px - side * 10, py + 6);
  } else {
    space.moveTo(px, py - side * 2);
    space.lineTo(px - 6, py - side * 10);
    space.lineTo(px + 6, py - side * 10);
  }

  space.fill();
  space.restore();
  space.save();
  space.globalAlpha = alpha;

  const reading = [{ text: readout(value), color: CANVAS_COLORS.amber }];

  // Over the tape's labels, on the outer side, like an instrument's window
  if (vertical) drawTag(space, px + side * 12, py, reading, side > 0);
  else drawTag(space, px - 36, py - side * 26, reading, true);

  space.restore();
};
/**
 * E, Cockpit visor: laid out like an aircraft head-up display. A bearing
 * tape across the top, the orbital speed on the left and the range on the
 * right, each sliding past a fixed pointer; a gun sight on the body with
 * horizon bars. It powers on when it opens: the tapes fade up.
 */
const drawVisor = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: OrbitingBodyType
): void => {
  const width = space.canvas.clientWidth;
  const { range, bearing, speed } = getOrbitState(body);
  const compact = isCompact(space);
  const on = getVisorProgress(body.id);

  space.globalAlpha = on;

  // The limb, the gun sight and the horizon bars
  space.strokeStyle = TEAL_LINE;
  space.lineWidth = 1;
  space.beginPath();
  space.arc(x, y, r + 1, 0, TWO_PI);
  space.stroke();
  space.strokeStyle = CANVAS_COLORS.amber;
  space.lineWidth = 2;
  drawArcs(space, x, y, 16, 4, 60, 15);
  space.fillStyle = CANVAS_COLORS.amber;
  space.beginPath();
  space.arc(x, y, 2, 0, TWO_PI);
  space.fill();
  space.beginPath();
  [-1, 1].forEach((side) => {
    space.moveTo(x + side * r * 1.05, y);
    space.lineTo(x + side * r * 1.18, y);
    space.lineTo(x + side * r * 1.18, y + 10);
  });
  space.stroke();
  // Pitch marks above and below the horizon, short and dashed
  space.strokeStyle = 'rgba(255, 181, 71, 0.45)';
  space.lineWidth = 1;
  space.setLineDash([6, 4]);
  space.beginPath();
  [-1, 1].forEach((up) => {
    [-1, 1].forEach((side) => {
      const at = y + up * r * 0.5;
      const reach = Math.sqrt(r * r - (r * 0.5) ** 2);

      space.moveTo(x + side * (reach + 6), at);
      space.lineTo(x + side * (reach + r * 0.18), at);
    });
  });
  space.stroke();
  space.setLineDash([]);
  space.globalAlpha = 1;

  // The bearing tape, across the top (over the body on a narrow screen)
  drawTape(space, {
    spine: compact ? y - r - 30 : 40,
    middle: x,
    half: Math.min(260, r * 1.15),
    value: bearing,
    step: 1,
    perStep: 6,
    labelEvery: 10,
    format: (degree) =>
      String(Math.round(((degree % 360) + 360) % 360)).padStart(3, '0'),
    readout: (degree) => degree.toFixed(1).padStart(5, '0'),
    side: -1,
    vertical: false,
    title: 'BRG',
    alpha: on
  });

  // Range on the right, orbital speed on the left, like altitude and airspeed
  const tall = r * 0.85;
  const rangeStep = 10 ** Math.floor(Math.log10(range * 0.002));

  drawTape(space, {
    spine: Math.min(x + r * 1.35, width - 90),
    middle: y,
    half: tall,
    value: range,
    step: rangeStep,
    perStep: 10,
    labelEvery: 10,
    format: (value) => value.toFixed(Math.max(0, -Math.log10(rangeStep))),
    readout: (value) => value.toFixed(Math.max(0, 2 - Math.log10(rangeStep))),
    side: 1,
    vertical: true,
    title: 'RNG AU',
    alpha: on
  });

  if (speed !== null && !compact) {
    const speedStep = 10 ** Math.floor(Math.log10(speed * 0.004));

    drawTape(space, {
      spine: Math.max(x - r * 1.35, 90),
      middle: y,
      half: tall,
      value: speed,
      step: speedStep,
      perStep: 10,
      labelEvery: 10,
      format: (value) => value.toFixed(Math.max(0, -Math.log10(speedStep))),
      readout: (value) => value.toFixed(Math.max(0, 2 - Math.log10(speedStep))),
      side: -1,
      vertical: true,
      title: 'VEL KM/S',
      alpha: on
    });
  }
};

/**
 * Dresses up the body in the focus view, over its plain disc: shaded from
 * its star, with the visor round it (see `drawVisor()`).
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 *
 * @example
 * ```ts
 * drawFocusBody(space); // after the bodies, before the labels
 * ```
 */
export const drawFocusBody = (space: CanvasRenderingContext2D): void => {
  const body = globalThis.FOCUSED_CELESTIAL_BODY;
  const tracked = body ? globalThis.NEAREST_BODIES[body.id] : undefined;

  if (!body || !tracked || tracked.size < MIN_RADIUS) return;

  const { x, y, size } = tracked;
  const light = getLightAngle(body);

  if (light !== null) drawShading(space, x, y, size, light);

  space.save();
  drawVisor(space, x, y, size, body);
  space.restore();
};
