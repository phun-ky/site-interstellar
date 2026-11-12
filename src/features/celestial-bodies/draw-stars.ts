import { SYSTEMS, TWO_PI } from '@interstellar-tools/constants';
import { convertDistanceUnit } from '@interstellar-tools/equations';
import { StarsType, ValueInterface } from '@interstellar-tools/types';

/** A star, as the datasets hold it. */
type StarType = StarsType[number];

import { distanceToPixels } from '../../utils/distance/distance-to-pixels';
import { getParentBodyOffset } from '../../utils/offset/get-parent-body-offset';
import { CANVAS_COLORS } from '../canvas/config/ui';
import { getLabelCandidates } from '../labels/draw';
import { type LabelCandidateType } from '../labels/utils/place-labels';

import { drawStar } from './draw-celestial-bodies';
import { findBodyById } from './utils/body-catalog';
import { getBodyPosition } from './utils/get-body-position';
import { getDrawnSize } from './utils/get-drawn-size';
import {
  groupByOverlap,
  groupBySystem,
  type StarMarkerType,
  type StarPointType,
  toMarkers
} from './utils/star-groups';

/** The gap between a group's star and the ring round it, in pixels. */
const GROUP_RING_GAP = 4;
/** The rank that puts the Sun ahead of any other star but the locked one. */
const SUN_RANK = Number.MAX_SAFE_INTEGER / 2;
const SYSTEM_IDS = new Set(SYSTEMS.map(({ id }) => id));

export type DrawStarsPropsType = {
  space: CanvasRenderingContext2D;
  scale: ValueInterface;
  /** The stars to draw. */
  stars: StarsType;
  /** Where the Milky Way's centre is on the canvas, in pixels. */
  referenceX: number;
  referenceY: number;
  /** Whether to return the stars' labels. */
  labelled: boolean;
};

/**
 * Which star leads a group it is in: the locked star, then the Sun, then the
 * larger stars.
 */
const rankOf = (star: StarType): number => {
  if (star.id === globalThis.LOCKED_CELESTIAL_BODY?.id) return Infinity;

  if (star.id === 'sun') return SUN_RANK;

  return convertDistanceUnit(star.radius, 'km').value;
};
/** The systems a star is in, innermost first: `['alpha-centauri-ab', 'alpha-centauri']`. */
const systemsOf = (star: StarType): string[] => {
  const systems: string[] = [];

  for (
    let id = star.parent;
    id && SYSTEM_IDS.has(id);
    id = findBodyById(id)?.parent
  ) {
    systems.push(id);
  }

  return systems;
};

/**
 * Draws the stars, as few markers as keep every one apart (#13): a star
 * system whose stars overlap is drawn as one, named after the system, and
 * whatever still overlaps, such as the stars round the Sun at the galaxy's
 * scale, as the leading one (the locked star, the Sun, or else the largest),
 * with a count. A marker standing for several stars has a ring round it.
 * Zooming in splits them as they come apart.
 *
 * Every star is kept in `globalThis.NEAREST_BODIES` where its marker is,
 * the lead first, so a click on a marker picks its lead.
 *
 * @param {DrawStarsPropsType} props - The canvas, the stars and where the Milky Way's centre is.
 * @returns {LabelCandidateType[]} One label per marker, when `labelled`.
 *
 * @example
 * ```ts
 * labels.push(...drawStars({ space, scale, stars, referenceX, referenceY, labelled: true }));
 * ```
 */
export const drawStars = ({
  space,
  scale,
  stars,
  referenceX,
  referenceY,
  labelled
}: DrawStarsPropsType): LabelCandidateType[] => {
  const byId = new Map(stars.map((star) => [star.id, star]));
  const parentOf = (id?: string) => {
    const { parentOffsetX, parentOffsetY } = getParentBodyOffset(id, scale);

    return { x: referenceX + parentOffsetX, y: referenceY + parentOffsetY };
  };
  const points: StarPointType[] = stars.map((star) => {
    const parent = parentOf(star.parent);
    const { x, y } = getBodyPosition(star);
    const xPX = parent.x + distanceToPixels(x, scale);
    const yPX = parent.y + distanceToPixels(y, scale);

    return {
      id: star.id,
      x: xPX,
      y: yPX,
      size: getDrawnSize(
        star,
        scale,
        Math.hypot(xPX - parent.x, yPX - parent.y)
      ),
      rank: rankOf(star),
      systems: systemsOf(star)
    };
  });
  const systems = SYSTEMS.map(({ id, name }) => ({
    id,
    name,
    // A system is where its stars are drawn round: what `parentOf` gives them
    ...parentOf(id)
  }));
  const markers = groupByOverlap(groupBySystem(toMarkers(points), systems));
  const labels: LabelCandidateType[] = [];

  space.save();
  markers.forEach((marker: StarMarkerType) => {
    const { lead, members, x, y, size } = marker;
    const star = byId.get(lead.id) as StarType;

    drawStar(space, x, y, size, star.display?.color ?? 'white');

    if (members.length > 1) {
      space.strokeStyle = CANVAS_COLORS.teal;
      space.lineWidth = 1;
      space.beginPath();
      space.arc(x, y, size + GROUP_RING_GAP, 0, TWO_PI);
      space.stroke();
    }

    // The lead first, so a click on the marker picks it
    [lead, ...members.filter((member) => member !== lead)].forEach((member) => {
      const body = byId.get(member.id) as StarType;

      globalThis.NEAREST_BODIES[member.id] = {
        id: member.id,
        x,
        y,
        size,
        name: body.name,
        category: body.category,
        parent: undefined
      };
    });

    if (!labelled) return;

    // The lead's label, on the marker, named after the system it is
    const offset = getBodyPosition(star);
    const [label] = getLabelCandidates({
      celestialBodies: [star],
      scale,
      referenceX: x - distanceToPixels(offset.x, scale),
      referenceY: y - distanceToPixels(offset.y, scale)
    });

    labels.push({
      ...label,
      text: (marker.system?.name ?? star.name).toUpperCase(),
      // Ranked as its lead, so the Sun's group is named after the Sun
      priority: lead.rank,
      bodies: members.length,
      others: members.length - marker.named
    });
  });
  space.restore();

  return labels;
};
