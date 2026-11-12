/** A star where it is drawn this frame, in canvas pixels. */
export type StarPointType = {
  id: string;
  x: number;
  y: number;
  /** Its drawn radius. */
  size: number;
  /** Which star leads a group it is in: the higher. */
  rank: number;
  /** The systems it is in, innermost first, such as `['alpha-centauri-ab', 'alpha-centauri']`. */
  systems: string[];
};

/** A star system where it is drawn this frame, in canvas pixels. */
export type SystemPointType = {
  id: string;
  name: string;
  x: number;
  y: number;
};

/** What is drawn for a star, or for several stars drawn as one. */
export type StarMarkerType = {
  /** The highest ranked star in it, which it is drawn as. */
  lead: StarPointType;
  /** Every star it stands for, the lead among them. */
  members: StarPointType[];
  x: number;
  y: number;
  size: number;
  /** For a system drawn as one, the system it is. */
  system?: SystemPointType;
  /**
   * How many of its members the system it is named after stands for: all of
   * them for a system drawn as one, or 1 for a star.
   */
  named: number;
  /** The systems it is in, innermost first. */
  systems: string[];
};

/** Whether two drawn discs overlap. */
const overlaps = (
  a: { x: number; y: number; size: number },
  b: { x: number; y: number; size: number }
): boolean => Math.hypot(a.x - b.x, a.y - b.y) < a.size + b.size;

/**
 * One marker per star, each drawn on its own.
 *
 * @param {StarPointType[]} stars - The stars.
 * @returns {StarMarkerType[]} A marker for each.
 *
 * @example
 * ```ts
 * groupByOverlap(groupBySystem(toMarkers(stars), systems));
 * ```
 */
export const toMarkers = (stars: StarPointType[]): StarMarkerType[] =>
  stars.map((star) => ({
    lead: star,
    members: [star],
    x: star.x,
    y: star.y,
    size: star.size,
    named: 1,
    systems: star.systems
  }));

/**
 * Draws each star system as one marker while any of its stars, or of the
 * systems in it, overlap (#13). Innermost systems go first, so Alpha
 * Centauri A and B become Alpha Centauri AB, and only once that overlaps
 * Proxima Centauri does all of Alpha Centauri become one. The marker is drawn
 * where the system is, as large as its largest member.
 *
 * @param {StarMarkerType[]} markers - The stars, from `toMarkers`.
 * @param {SystemPointType[]} systems - The star systems, where they are drawn.
 * @returns {StarMarkerType[]} The markers, with each crowded system as one.
 *
 * @example
 * ```ts
 * groupBySystem(toMarkers(stars), systems);
 * ```
 */
export const groupBySystem = (
  markers: StarMarkerType[],
  systems: SystemPointType[]
): StarMarkerType[] => {
  // How deep a system sits: the most systems a star in it is in, from it out
  const depth = ({ id }: SystemPointType): number =>
    Math.max(
      0,
      ...markers.map(({ systems: chain }) =>
        chain.includes(id) ? chain.length - chain.indexOf(id) : 0
      )
    );

  let current = markers;

  for (const system of [...systems].sort((a, b) => depth(b) - depth(a))) {
    const inside = current.filter(
      ({ systems: chain }) => chain[0] === system.id
    );
    const crowded = inside.some((a, i) =>
      inside.slice(i + 1).some((b) => overlaps(a, b))
    );

    if (!crowded) continue;

    const members = inside.flatMap((marker) => marker.members);

    current = [
      ...current.filter((marker) => !inside.includes(marker)),
      {
        lead: members.reduce((best, star) =>
          star.rank > best.rank ? star : best
        ),
        members,
        x: system.x,
        y: system.y,
        size: Math.max(...inside.map(({ size }) => size)),
        system,
        named: members.length,
        systems: inside[0].systems.slice(1)
      }
    ];
  }

  return current;
};

/**
 * Draws markers that overlap as one (#13), the stars round the Sun at the
 * galaxy's scale, say: the one with the highest ranked lead stands for the
 * rest, drawn where it is. Overlap chains, so three markers in a row are one
 * when each touches the next.
 *
 * @param {StarMarkerType[]} markers - The markers, from `toMarkers` or `groupBySystem`.
 * @returns {StarMarkerType[]} The markers, with each overlapping set as one.
 *
 * @example
 * ```ts
 * groupByOverlap(groupBySystem(toMarkers(stars), systems));
 * ```
 */
export const groupByOverlap = (markers: StarMarkerType[]): StarMarkerType[] => {
  const root = markers.map((_, i) => i);
  const find = (i: number): number =>
    root[i] === i ? i : (root[i] = find(root[i]));

  markers.forEach((a, i) =>
    markers.slice(i + 1).forEach((b, k) => {
      if (overlaps(a, b)) root[find(i + 1 + k)] = find(i);
    })
  );

  const sets = new Map<number, StarMarkerType[]>();

  markers.forEach((marker, i) =>
    sets.set(find(i), [...(sets.get(find(i)) ?? []), marker])
  );

  return [...sets.values()].map((set) => {
    const head = set.reduce((best, marker) =>
      marker.lead.rank > best.lead.rank ? marker : best
    );

    return set.length === 1
      ? head
      : { ...head, members: set.flatMap(({ members }) => members) };
  });
};
