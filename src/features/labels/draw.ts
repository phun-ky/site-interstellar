import { convertDistanceUnit } from '@interstellar-tools/equations';
import {
  CelestialBodiesType,
  CelestialBodyType,
  ValueInterface
} from '@interstellar-tools/types';

import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import {
  CANVAS_COLORS,
  CANVAS_LABEL_FONT,
  setLabelLetterSpacing
} from '../canvas/config/ui';
import { getReticleHalfSize } from '../celestial-bodies/draw-lock-reticle';
import { getBodyPosition } from '../celestial-bodies/utils/get-body-position';

import {
  type LabelBoxType,
  type LabelCandidateType,
  placeLabels
} from './utils/place-labels';

export type GetLabelCandidatesPropsType = {
  referenceX: number;
  referenceY: number;
  celestialBodies: CelestialBodiesType;
  scale: ValueInterface;
};

export type DrawLabelsPropsType = {
  space: CanvasRenderingContext2D;
  /** Fixed text no label may cover, such as the Milky Way's name. */
  obstacles?: LabelBoxType[];
  /** Every label that could be drawn this frame, from `getLabelCandidates`. */
  labels: LabelCandidateType[];
};

/** Space either side of a label's name, in pixels. */
const PADDING_X = 8;
/** The height of a label's box, in pixels. */
const BOX_HEIGHT = 20;
/** The distance between a body and the bottom of its label, in pixels. */
const GAP = 24;
/** How far past the canvas edge a label is still considered: wider than any label. */
const OFF_SCREEN_MARGIN = 400;

/**
 * The labels a group of bodies could have this frame: each body's name,
 * centred above it, `GAP` pixels clear of its radius. The locked body's
 * label has the highest priority, then the larger bodies'.
 *
 * Bodies are placed relative to a reference point: their parent's position
 * on the canvas, in pixels.
 *
 * @param {GetLabelCandidatesPropsType} props - The bodies, their reference point and the scale.
 * @returns {LabelCandidateType[]} One label per body.
 *
 * @example
 * ```ts
 * labels.push(
 *   ...getLabelCandidates({ celestialBodies: planets, referenceX, referenceY, scale })
 * );
 * ```
 */
export const getLabelCandidates = ({
  referenceX,
  referenceY,
  scale,
  celestialBodies
}: GetLabelCandidatesPropsType): LabelCandidateType[] =>
  celestialBodies.map((body: CelestialBodyType) => {
    const { id, name, radius } = body;
    const { x, y } = getBodyPosition(body);
    const xPX = referenceX + distanceToPixels(x, scale);
    const yPX = referenceY + distanceToPixels(y, scale);

    return {
      id,
      text: name.toUpperCase(),
      x: xPX,
      y: yPX,
      bottom: yPX - distanceToPixels(radius, scale) - GAP,
      priority:
        globalThis.LOCKED_CELESTIAL_BODY?.id === id
          ? Infinity
          : convertDistanceUnit(radius, 'km').value
    };
  });

/**
 * Draws the body labels for a frame: a name in a box above each body, with a
 * leader line down to it. Where labels would overlap, only the higher
 * priority one is drawn, counting the ones it hides (see `placeLabels`), and
 * no label is drawn over the locked body's reticle. The boxes drawn are kept
 * in `globalThis.LABEL_BOXES`.
 *
 * Call it after the bodies are drawn: it reads their drawn sizes from
 * `globalThis.NEAREST_BODIES`, and draws over them.
 *
 * @param {DrawLabelsPropsType} props - The canvas and every label that could be drawn.
 *
 * @example
 * ```ts
 * drawLabels({ space, labels });
 * ```
 */
export const drawLabels = ({
  space,
  labels,
  obstacles = []
}: DrawLabelsPropsType): void => {
  space.save();
  space.font = CANVAS_LABEL_FONT;
  setLabelLetterSpacing(space);
  space.textAlign = 'center';
  space.textBaseline = 'middle';
  space.lineWidth = 1;

  const { clientWidth, clientHeight } = space.canvas;
  // Labels far off the canvas can't be seen or overlap one that can
  const nearby = labels.filter(
    ({ x, bottom }) =>
      x > -OFF_SCREEN_MARGIN &&
      x < clientWidth + OFF_SCREEN_MARGIN &&
      bottom > 0 &&
      bottom - BOX_HEIGHT < clientHeight
  );
  const locked = globalThis.LOCKED_CELESTIAL_BODY;
  const tracked = locked && globalThis.NEAREST_BODIES[locked.id];

  // The locked body's label claims its reticle, so no label covers it
  if (tracked) {
    const half = getReticleHalfSize(tracked.size);
    const label = nearby.find(({ id }) => id === locked.id);

    if (label) {
      label.area = {
        left: tracked.x - half,
        top: tracked.y - half,
        width: 2 * half,
        height: 2 * half
      };
    }
  }

  const placed = placeLabels(
    nearby,
    (text) => space.measureText(text).width + 2 * PADDING_X,
    BOX_HEIGHT,
    obstacles
  );

  globalThis.LABEL_BOXES = placed.map(({ id, label, box }) => ({
    id,
    label,
    ...box
  }));

  placed.forEach(({ id, label, x, y, box }) => {
    const boxX = Math.round(box.left) + 0.5;
    const boxY = Math.round(box.top) + 0.5;
    // Leader line from the bottom of the label to the top of the drawn body
    const size = globalThis.NEAREST_BODIES[id]?.size ?? 0;

    space.strokeStyle = CANVAS_COLORS.leader;
    space.beginPath();
    space.moveTo(x, boxY + BOX_HEIGHT);
    space.lineTo(x, Math.max(boxY + BOX_HEIGHT, y - size));
    space.stroke();

    // Label box: panel fill with a teal hairline
    space.fillStyle = CANVAS_COLORS.panel;
    space.fillRect(boxX, boxY, box.width, BOX_HEIGHT);
    space.strokeStyle = CANVAS_COLORS.line;
    space.strokeRect(boxX, boxY, box.width, BOX_HEIGHT);

    space.fillStyle = CANVAS_COLORS.text;
    space.fillText(label, boxX + box.width / 2, boxY + BOX_HEIGHT / 2);
  });
  space.restore();
};
