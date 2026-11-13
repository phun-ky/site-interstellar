import { starfield } from './config';

/** A starfield layer, far to near: 0 is the farthest. */
export type StarfieldLayerIndexType = 0 | 1 | 2;

/** A star in the background starfield, drawn on its depth layer. */
export interface StarfieldStarInterface {
  x: number;
  y: number;
  /** Its radius, in pixels: below 0.5 a faint dot smaller than a pixel. */
  size: number;
  /** Its colour and opacity, such as `rgba(200,200,255,0.5)`. */
  color: string;
  /** Its depth layer, which sets how much it moves as the map pans and zooms. */
  layer: StarfieldLayerIndexType;
  /** Whether its light is shifted towards red, as a distant source's is. */
  redshifted: boolean;
}

/** A colour, its red, green and blue, with the opacity it is drawn at. */
type TintType = [red: number, green: number, blue: number, alpha: number];

/** What a depth layer holds. */
type StarfieldLayerSpecType = {
  /** How many stars, at the reference size of 1920 x 1080. */
  count: number;
  /** The smallest and largest radius, in pixels. */
  size: [min: number, max: number];
  /** The colours its stars are drawn in, as the first starfield had them. */
  tints: TintType[];
  /** The share of its stars whose light is redshifted. */
  redshift: number;
};

/** The reference size the counts are for. */
const BASE_AREA = 1920 * 1080;

/**
 * The layers, far to near. The near and middle layers keep the first
 * starfield's tiers: white and bluish white, then light and deeper blue.
 * The far layer adds many fainter, smaller stars, and a share of the far
 * and middle stars are redshifted, tinted towards red as the light of
 * distant sources is.
 */
export const STARFIELD_LAYERS: Readonly<
  Record<StarfieldLayerIndexType, StarfieldLayerSpecType>
> = {
  0: {
    count: 14000,
    size: [0.2, 0.5],
    tints: [
      [150, 150, 255, 0.32],
      [190, 195, 255, 0.24],
      [150, 150, 255, 0.16]
    ],
    redshift: 0.18
  },
  1: {
    count: 6000,
    size: [0.4, 0.9],
    tints: [
      [200, 200, 255, 0.5],
      [170, 170, 255, 0.3]
    ],
    redshift: 0.06
  },
  2: {
    count: 900,
    size: [0.7, 1.3],
    tints: [
      [255, 255, 255, 0.9],
      [220, 220, 255, 0.7]
    ],
    redshift: 0
  }
};

/** How much stronger a redshifted star is drawn than the tint it replaces, as red reads darker. */
const REDSHIFT_ALPHA = 1.5;
/**
 * A redshifted tint: from orange to deep red, a little stronger than the
 * tint it replaces (see `REDSHIFT_ALPHA`).
 *
 * @param {number} alpha - The opacity of the tint it replaces.
 * @param {() => number} random - A random number from 0 to 1.
 * @returns {string} The colour, such as `rgba(255,150,120,0.22)`.
 */
const redshiftedColor = (alpha: number, random: () => number): string => {
  const shift = random();
  const strength = Math.min(1, alpha * REDSHIFT_ALPHA);

  return `rgba(255,${Math.round(190 - 70 * shift)},${Math.round(150 - 50 * shift)},${strength})`;
};

/**
 * Makes the stars of a starfield as wide and high as the canvas, in three
 * depth layers (see `STARFIELD_LAYERS`), as many per area as at the
 * reference size of 1920 x 1080:
 *
 * $$
 * N_{layer} = \frac{w \times h}{1920 \times 1080} \times \text{count}_{layer}
 * $$
 *
 * @param {number} width - The canvas's width, in pixels.
 * @param {number} height - The canvas's height, in pixels.
 * @param {() => number} [random=Math.random] - A random number from 0 to 1.
 * @returns {StarfieldStarInterface[]} The stars, far layer first.
 *
 * @example
 * ```ts
 * createStarfield(1920, 1080).length; // 20900
 * ```
 */
export const createStarfield = (
  width: number,
  height: number,
  random: () => number = Math.random
): StarfieldStarInterface[] => {
  const share = (width * height) / BASE_AREA;
  const layers = Object.entries(STARFIELD_LAYERS) as unknown as [
    string,
    StarfieldLayerSpecType
  ][];

  return layers.flatMap(([index, spec]) => {
    const layer = Number(index) as StarfieldLayerIndexType;
    const [min, max] = spec.size;

    return Array.from({ length: Math.round(share * spec.count) }, () => {
      const [red, green, blue, alpha] =
        spec.tints[Math.floor(random() * spec.tints.length)];
      const redshifted = random() < spec.redshift;

      return {
        x: random() * width,
        y: random() * height,
        size: min + random() * (max - min),
        color: redshifted
          ? redshiftedColor(alpha, random)
          : `rgba(${red},${green},${blue},${alpha})`,
        layer,
        redshifted
      };
    });
  });
};

/**
 * Makes the starfield for the canvas's size (see `createStarfield()`), and
 * keeps it to draw.
 *
 * @param {number} canvasWidth - The canvas's width, in pixels.
 * @param {number} canvasHeight - The canvas's height, in pixels.
 *
 * @example
 * ```ts
 * generateStarfield(800, 600);
 * ```
 *
 * @see [Parallax](https://en.wikipedia.org/wiki/Parallax)
 * @see [Redshift](https://en.wikipedia.org/wiki/Redshift)
 */
export const generateStarfield = (
  canvasWidth: number,
  canvasHeight: number
): void => {
  starfield.value = createStarfield(canvasWidth, canvasHeight);
};
