/** A rectangle in canvas pixels. */
export type LabelBoxType = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** A label that could be drawn: a body's name, above the body. */
export type LabelCandidateType = {
  /** The body's id. */
  id: string;
  /** The body's name, as drawn. */
  text: string;
  /** The body's centre, in canvas pixels: where the leader line ends. */
  x: number;
  y: number;
  /** Where the bottom of the label sits, in canvas pixels. */
  bottom: number;
  /** Which label wins where two would overlap: the higher. */
  priority: number;
  /**
   * How many bodies the label stands for: more than 1 for stars drawn as one
   * (#13), such as a star system. Defaults to 1.
   */
  bodies?: number;
  /**
   * How many of those its text doesn't name, counted on it from the start:
   * 17 for `SUN` standing for 18 stars, 0 for `SIRIUS` standing for its 2.
   * Defaults to 0.
   */
  others?: number;
  /**
   * Space the label claims besides its own box, such as the lock reticle
   * round the locked body, so no other label is drawn over it.
   */
  area?: LabelBoxType;
};

/** A label that is drawn, and how many it hides. */
export type PlacedLabelType = LabelCandidateType & {
  /** What the label says: the name, then `+N` when it hides N labels. */
  label: string;
  /** How many bodies it counts besides those its text names: its `others`, and those of the labels left out for it. */
  hidden: number;
  /** Where the label box is drawn. */
  box: LabelBoxType;
};

/** The space kept clear between two labels, in pixels, so each reads on its own. */
export const LABEL_GAP = 4;

/**
 * Whether two label boxes overlap, or come closer than `LABEL_GAP`.
 *
 * @param {LabelBoxType} a - One box.
 * @param {LabelBoxType} b - The other box.
 * @returns {boolean} Whether they are too close.
 *
 * @example
 * ```ts
 * labelsCollide(sunBox, jupiterBox);
 * ```
 */
export const labelsCollide = (a: LabelBoxType, b: LabelBoxType): boolean =>
  a.left < b.left + b.width + LABEL_GAP &&
  b.left < a.left + a.width + LABEL_GAP &&
  a.top < b.top + b.height + LABEL_GAP &&
  b.top < a.top + a.height + LABEL_GAP;

/** How many bodies a label counts on the one it is left out for: what it stands for, and what it already counted. */
const countOf = ({
  bodies = 1,
  others = 0,
  hidden = others
}: LabelCandidateType & { hidden?: number }): number =>
  bodies - others + hidden;
/** The space a label takes: its box, and any area it claims. */
const spaceOf = (box: LabelBoxType, area?: LabelBoxType): LabelBoxType[] =>
  area ? [box, area] : [box];
/** Whether any part of one label's space collides with any part of another's. */
const spacesCollide = (a: LabelBoxType[], b: LabelBoxType[]): boolean =>
  a.some((one) => b.some((other) => labelsCollide(one, other)));

/**
 * Chooses which body labels to draw so that no two overlap (#91).
 *
 * Labels are placed highest priority first (the locked body, then the larger
 * bodies; ties by id, so the choice holds steady from frame to frame). A label
 * that would overlap one already placed is left out, and the label it would
 * overlap counts it: `SUN +3`, as the off-screen arrows do. A label standing
 * for several bodies (`bodies`, such as a star system drawn as one) counts as
 * that many, and one that starts with a count (`others`) shows it. A label that grows
 * with its count can come to overlap another placed label; then the lower of
 * the two is left out too, and the higher counts it and what it hid. A
 * label's `area`, such as the locked body's reticle, counts as part of it.
 * A label over one of the `obstacles` (fixed text, such as the Milky Way's
 * name) is left out, with nothing to count it on.
 *
 * @param {LabelCandidateType[]} candidates - Every label that could be drawn.
 * @param {(text: string) => number} measure - The width a label's box needs for a text, in pixels.
 * @param {number} height - The height of a label's box, in pixels.
 * @param {LabelBoxType[]} [obstacles=[]] - Fixed text no label may cover.
 * @returns {PlacedLabelType[]} The labels to draw, highest priority first.
 *
 * @example
 * ```ts
 * placeLabels(candidates, (text) => space.measureText(text).width + 16, 20);
 * ```
 */
export const placeLabels = (
  candidates: LabelCandidateType[],
  measure: (text: string) => number,
  height: number,
  obstacles: LabelBoxType[] = []
): PlacedLabelType[] => {
  const blocked = (label: { box: LabelBoxType; area?: LabelBoxType }) =>
    spacesCollide(spaceOf(label.box, label.area), obstacles);
  const boxFor = (
    { x, bottom }: LabelCandidateType,
    label: string
  ): LabelBoxType => {
    const width = measure(label);

    return { left: x - width / 2, top: bottom - height, width, height };
  };
  const relabel = (placed: PlacedLabelType) => {
    placed.label = `${placed.text} +${placed.hidden}`;
    placed.box = boxFor(placed, placed.label);
  };
  const sorted = [...candidates].sort(
    (a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1)
  );
  const placed: PlacedLabelType[] = [];

  for (const candidate of sorted) {
    const box = boxFor(candidate, candidate.text);

    // Over fixed text, such as the Milky Way's name: nothing to count it on
    if (blocked({ box, area: candidate.area })) continue;

    const covering = placed.find((other) =>
      spacesCollide(
        spaceOf(box, candidate.area),
        spaceOf(other.box, other.area)
      )
    );

    if (covering) covering.hidden += countOf(candidate);
    else {
      placed.push({
        ...candidate,
        label: candidate.text,
        hidden: candidate.others ?? 0,
        box
      });
    }
  }

  // Counts widen their labels, which may now reach a neighbour
  for (const label of placed) if (label.hidden) relabel(label);

  for (;;) {
    // A label widened onto fixed text is left out, its count with it
    const onObstacle = placed.findIndex(blocked);

    if (onObstacle >= 0) {
      placed.splice(onObstacle, 1);
      continue;
    }

    let clash: [PlacedLabelType, number] | null = null;

    for (let i = 0; i < placed.length && !clash; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (
          spacesCollide(
            spaceOf(placed[i].box, placed[i].area),
            spaceOf(placed[j].box, placed[j].area)
          )
        ) {
          clash = [placed[i], j];
          break;
        }
      }
    }

    if (!clash) return placed;

    const [kept, dropped] = clash;

    kept.hidden += countOf(placed[dropped]);
    placed.splice(dropped, 1);
    relabel(kept);
  }
};
