/**
 * A picture of a body, for the focus view (#126): a photograph or image from
 * a spacecraft or telescope, or a labelled artist's impression. The files are
 * served from `images/bodies/`, as `<id>-360.webp` and `<id>-720.webp`, each
 * fitted whole (not cropped) inside a square that many pixels wide.
 */
export type BodyImageType = {
  /** What it shows, as the frame's caption: `Saturn at equinox`. */
  title: string;
  /** What it looks like, for screen readers. */
  alt: string;
  /** Who made it, and with what: `NASA / JPL / Space Science Institute`. */
  credit: string;
  /** The year it was taken or made, where known. */
  year?: number;
  /** Its licence, as Wikimedia Commons names it. */
  licence: LicenceType;
  /** Its page on Wikimedia Commons, with its full credit and licence. */
  source: string;
  /** The 720 px file's size, so the frame keeps its shape while it loads. */
  width: number;
  height: number;
  /** An artist's impression, not an image of the body itself. */
  impression?: true;
};

/** The licences the images are under. */
export type LicenceType =
  | 'Public domain'
  | 'CC BY 2.0'
  | 'CC BY 3.0'
  | 'CC BY 4.0'
  | 'CC BY-SA 3.0'
  | 'CC BY-SA 3.0 IGO'
  | 'CC BY-SA 4.0';

/** Each licence's deed, to link to; a public domain image has none. */
export const LICENCE_URLS: Record<LicenceType, string | null> = {
  'Public domain': null,
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 3.0 IGO': 'https://creativecommons.org/licenses/by-sa/3.0/igo/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
};

/** The widths the files come in, in pixels. */
export const IMAGE_WIDTHS = [360, 720] as const;

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

/**
 * The bodies' images, by body id. Each was chosen and checked by hand: see
 * `media/README.md` for how to add one.
 */
export const BODY_IMAGES: Readonly<Record<string, BodyImageType>> = {
  sun: {
    title: 'The Sun in ultraviolet',
    alt: 'The Sun in false-colour extreme ultraviolet light: an orange disc mottled with bright active regions, with loops of gas along its edge.',
    credit: 'NASA / SDO (AIA)',
    year: 2010,
    licence: 'Public domain',
    source: `${COMMONS}The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg`,
    width: 720,
    height: 687
  },
  mercury: {
    title: 'Mercury in true colour',
    alt: 'Mercury: a grey, heavily cratered globe, with bright rays of ejecta from young craters.',
    credit:
      'NASA / Johns Hopkins APL / Arizona State University / Carnegie Institution of Washington (MESSENGER)',
    licence: 'Public domain',
    source: `${COMMONS}Mercury_in_true_color.jpg`,
    width: 720,
    height: 720
  },
  venus: {
    title: "Venus's clouds",
    alt: 'Venus: a pale yellowish-white globe, wholly covered in smooth clouds.',
    credit: 'NASA (Mariner 10), processed by Ricardo Nunes',
    year: 1974,
    licence: 'Public domain',
    source: `${COMMONS}Venus-real_color.jpg`,
    width: 480,
    height: 480
  },
  earth: {
    title: 'The Blue Marble',
    alt: 'Earth, fully lit: Africa and Arabia under swirling white clouds, with Antarctica at the bottom.',
    credit: 'NASA, the Apollo 17 crew',
    year: 1972,
    licence: 'Public domain',
    source: `${COMMONS}The_Blue_Marble_(remastered).jpg`,
    width: 720,
    height: 720
  },
  moon: {
    title: 'The full Moon',
    alt: "The full Moon: grey highlands and the dark maria of the near side, with the bright crater Tycho's rays at the bottom.",
    credit: 'Gregory H. Revera',
    year: 2010,
    licence: 'CC BY-SA 3.0',
    source: `${COMMONS}FullMoon2010.jpg`,
    width: 720,
    height: 684
  },
  mars: {
    title: 'Mars from Rosetta',
    alt: 'Mars: a rust-red globe with darker markings and thin white haze at its edge.',
    credit: 'ESA & MPS for the OSIRIS team (Rosetta)',
    year: 2007,
    licence: 'CC BY-SA 3.0 IGO',
    source: `${COMMONS}OSIRIS_Mars_true_color.jpg`,
    width: 720,
    height: 720
  },
  jupiter: {
    title: 'Jupiter and its Great Red Spot',
    alt: 'Jupiter: cream and brown bands of cloud, with the Great Red Spot in the southern half.',
    credit: 'NASA, ESA and A. Simon (Goddard Space Flight Center), Hubble',
    year: 2014,
    licence: 'Public domain',
    source: `${COMMONS}Jupiter_and_its_shrunken_Great_Red_Spot.jpg`,
    width: 720,
    height: 720
  },
  saturn: {
    title: 'Saturn at equinox',
    alt: 'Saturn seen edge on to the Sun, its rings a thin bright line across the pale yellow globe, casting a narrow shadow.',
    credit: 'NASA / JPL / Space Science Institute (Cassini)',
    licence: 'Public domain',
    source: `${COMMONS}Saturn_during_Equinox.jpg`,
    width: 720,
    height: 349
  },
  uranus: {
    title: 'Uranus from Voyager 2',
    alt: 'Uranus: a smooth, featureless pale blue-green globe.',
    credit: 'NASA / JPL (Voyager 2)',
    year: 1986,
    licence: 'Public domain',
    source: `${COMMONS}Uranus_as_seen_by_NASA%27s_Voyager_2_(remastered)_-_JPEG_converted.jpg`,
    width: 720,
    height: 720
  },
  neptune: {
    title: 'Neptune from Voyager 2',
    alt: 'Neptune: a blue globe with darker blue spots and thin white clouds.',
    credit: 'NASA / JPL / Voyager-ISS, processed by Aster Cowart',
    year: 1989,
    licence: 'Public domain',
    source: `${COMMONS}Neptune_-_Voyager_2_(29347980845)_flatten_crop.jpg`,
    width: 720,
    height: 720
  },
  pluto: {
    title: 'Pluto from New Horizons',
    alt: 'Pluto: a beige and reddish-brown globe with a large pale heart-shaped plain.',
    credit:
      'NASA / Johns Hopkins APL / Southwest Research Institute / Alex Parker (New Horizons)',
    year: 2015,
    licence: 'Public domain',
    source: `${COMMONS}Pluto_in_True_Color_-_High-Res.jpg`,
    width: 720,
    height: 720
  },
  charon: {
    title: 'Charon from New Horizons',
    alt: 'Charon: a grey globe with a dark reddish cap at its north pole and a long canyon belt.',
    credit:
      'NASA / Johns Hopkins APL / Southwest Research Institute / Alex Parker (New Horizons)',
    year: 2015,
    licence: 'Public domain',
    source: `${COMMONS}Charon_in_True_Color_-_High-Res.jpg`,
    width: 720,
    height: 720
  },
  ceres: {
    title: 'Ceres from Dawn',
    alt: 'Ceres: a grey cratered dwarf planet with a few bright spots.',
    credit:
      'NASA / JPL-Caltech / UCLA / MPS / DLR / IDA (Dawn), processed by Justin Cowart',
    year: 2015,
    licence: 'Public domain',
    source: `${COMMONS}Ceres_-_RC3_-_Haulani_Crater_(22381131691)_(cropped).jpg`,
    width: 720,
    height: 706
  },
  io: {
    title: 'Io from Galileo',
    alt: 'Io: a yellow, orange and white globe dotted with dark volcanic spots.',
    credit: 'NASA / JPL / University of Arizona (Galileo)',
    licence: 'Public domain',
    source: `${COMMONS}Io_highest_resolution_true_color.jpg`,
    width: 720,
    height: 720
  },
  europa: {
    title: 'Europa from Galileo',
    alt: 'Europa: a pale icy globe crossed by reddish-brown cracks and ridges.',
    credit: 'NASA / JPL / DLR (Galileo)',
    licence: 'Public domain',
    source: `${COMMONS}Europa-moon-with-margins.jpg`,
    width: 720,
    height: 720
  },
  ganymede: {
    title: 'Ganymede from Juno',
    alt: 'Ganymede: a grey and brown globe with bright grooved terrain and dark older regions.',
    credit:
      'NASA / JPL-Caltech / SwRI / MSSS, processed by Kevin M. Gill (Juno)',
    year: 2021,
    licence: 'CC BY 2.0',
    source: `${COMMONS}Ganymede_-_Perijove_34_Composite.png`,
    width: 720,
    height: 720
  },
  callisto: {
    title: 'Callisto from Galileo',
    alt: 'Callisto: a dark brown globe densely covered in bright craters.',
    credit: 'NASA / JPL / DLR (Galileo)',
    licence: 'Public domain',
    source: `${COMMONS}Callisto.jpg`,
    width: 708,
    height: 720
  },
  titan: {
    title: 'Titan in true colour',
    alt: 'Titan: a fuzzy orange globe, its surface hidden by thick haze.',
    credit: 'NASA / JPL-Caltech / Space Science Institute (Cassini)',
    licence: 'Public domain',
    source: `${COMMONS}Titan_in_true_color.jpg`,
    width: 600,
    height: 600
  },
  enceladus: {
    title: 'Enceladus from Cassini',
    alt: 'Enceladus: a brilliant white icy globe with craters and long blue-grey fractures.',
    credit: 'NASA / JPL / Space Science Institute (Cassini)',
    licence: 'Public domain',
    source: `${COMMONS}PIA17202_-_Approaching_Enceladus.jpg`,
    width: 720,
    height: 720
  },
  triton: {
    title: 'Triton from Voyager 2',
    alt: 'Triton: a pinkish and grey globe, its southern polar cap streaked with dark plumes.',
    credit: 'NASA / JPL / U.S. Geological Survey (Voyager 2)',
    year: 1989,
    licence: 'Public domain',
    source: `${COMMONS}Triton_moon_mosaic_Voyager_2_(large).jpg`,
    width: 720,
    height: 720
  },
  betelgeuse: {
    title: 'Betelgeuse resolved by ALMA',
    alt: 'Betelgeuse: a blurred orange disc, brighter on one side: one of the few stars whose surface can be resolved.',
    credit: 'ALMA (ESO / NAOJ / NRAO) / E. O’Gorman / P. Kervella',
    year: 2017,
    licence: 'CC BY 4.0',
    source: `${COMMONS}Betelgeuse_captured_by_ALMA.jpg`,
    width: 720,
    height: 720
  },
  'sagittarius-a-star': {
    title: 'The first image of Sgr A*',
    alt: 'Sagittarius A*: a blurred orange ring of glowing gas round a dark centre, the shadow of the black hole.',
    credit: 'EHT Collaboration',
    year: 2022,
    licence: 'CC BY 4.0',
    source: `${COMMONS}EHT_Sagittarius_A_black_hole.tif`,
    width: 720,
    height: 720
  },
  'm87-star': {
    title: 'The first image of a black hole',
    alt: 'M87*: a lopsided orange ring of light round a dark centre, brighter at the bottom.',
    credit: 'Event Horizon Telescope',
    year: 2019,
    licence: 'CC BY 4.0',
    source: `${COMMONS}Black_hole_-_Messier_87_crop_max_res.jpg`,
    width: 720,
    height: 720
  },
  andromeda: {
    title: 'The Andromeda Galaxy',
    alt: 'The Andromeda Galaxy: a long tilted spiral with a bright yellow core, beside its two small companion galaxies.',
    credit: 'Adam Evans',
    licence: 'CC BY 2.0',
    source: `${COMMONS}Andromeda_Galaxy_(with_h-alpha).jpg`,
    width: 720,
    height: 473
  },
  triangulum: {
    title: 'The Triangulum Galaxy',
    alt: 'The Triangulum Galaxy: a loose face-on spiral, its arms dotted with pink star-forming regions.',
    credit: 'ESO (VST)',
    licence: 'CC BY 4.0',
    source: `${COMMONS}VST_snaps_a_very_detailed_view_of_the_Triangulum_Galaxy.jpg`,
    width: 604,
    height: 720
  },
  'large-magellanic-cloud': {
    title: 'The Large Magellanic Cloud',
    alt: 'The Large Magellanic Cloud: an irregular haze of stars with a bright bar and red nebulae, among foreground stars.',
    credit: 'NASA / Ames Research Center',
    licence: 'Public domain',
    source: `${COMMONS}Large.mc.arp.750pix.jpg`,
    width: 720,
    height: 480
  },
  m87: {
    title: 'Messier 87 and its jet',
    alt: 'Messier 87: a round, smooth glow of stars, with a thin blue jet reaching out from its core.',
    credit: 'NASA / STScI / WikiSky (Hubble)',
    licence: 'Public domain',
    source: `${COMMONS}Messier_87_Hubble_WikiSky.jpg`,
    width: 720,
    height: 720
  },
  'centaurus-a': {
    title: 'Centaurus A in three lights',
    alt: 'Centaurus A: a round galaxy crossed by a dark dust lane, with orange jets and blue lobes reaching out from its centre.',
    credit:
      'ESO / WFI (optical); MPIfR / ESO / APEX / A. Weiss et al. (submillimetre); NASA / CXC / CfA / R. Kraft et al. (X-ray)',
    licence: 'CC BY 4.0',
    source: `${COMMONS}ESO_Centaurus_A_LABOCA.jpg`,
    width: 684,
    height: 720
  },
  '1i-oumuamua': {
    title: 'ʻOumuamua',
    alt: "An artist's impression of ʻOumuamua: a long, dark reddish rock tumbling through space.",
    credit: 'ESO / M. Kornmesser, derivative by nagualdesign',
    year: 2017,
    licence: 'CC BY-SA 4.0',
    source: `${COMMONS}Artist%27s_impression_of_%CA%BBOumuamua.jpg`,
    width: 720,
    height: 471,
    impression: true
  },
  '2i-borisov': {
    title: 'Borisov at perihelion',
    alt: 'Comet Borisov: a fuzzy blue coma with a short faint tail, against black space.',
    credit: 'NASA, ESA and D. Jewitt (UCLA), Hubble',
    year: 2019,
    licence: 'Public domain',
    source: `${COMMONS}Comet_2I_Borisov_at_Perihelion_in_December_2019.tif`,
    width: 720,
    height: 657
  },
  '3i-atlas': {
    title: '3I/ATLAS from Hubble',
    alt: 'Comet 3I/ATLAS: a small blue glow with a faint coma, among streaks of background stars.',
    credit:
      'NASA, ESA, D. Jewitt (UCLA); image processing: J. DePasquale (STScI), Hubble',
    year: 2025,
    licence: 'CC BY 4.0',
    source: `${COMMONS}3I-ATLAS_Hubble_heic2509a.jpg`,
    width: 720,
    height: 531
  },
  '1p-halley': {
    title: "Halley's Comet",
    alt: "Halley's Comet: a bright head and a long blue-white tail across a field of stars.",
    credit: 'NASA / W. Liller',
    year: 1986,
    licence: 'Public domain',
    source: `${COMMONS}Lspn_comet_halley.jpg`,
    width: 720,
    height: 489
  },
  '67p-churyumov-gerasimenko': {
    title: '67P from Rosetta',
    alt: 'Comet 67P: a grey two-lobed nucleus like a rubber duck, with faint jets of dust.',
    credit: 'ESA / Rosetta / NAVCAM',
    year: 2014,
    licence: 'CC BY-SA 3.0 IGO',
    source: `${COMMONS}Comet_67P_on_19_September_2014_NavCam_mosaic.jpg`,
    width: 720,
    height: 573
  }
};

/**
 * A body's image, by its own id only, so an id such as `toString` never
 * finds an inherited property.
 *
 * @param {string} id - The body's id.
 * @returns {BodyImageType | undefined} Its image, or `undefined` without one.
 *
 * @example
 * ```ts
 * getBodyImage('saturn')?.title; // "Saturn at equinox"
 * ```
 */
export const getBodyImage = (id: string): BodyImageType | undefined =>
  Object.hasOwn(BODY_IMAGES, id) ? BODY_IMAGES[id] : undefined;

/**
 * Where a body's image files are, for an `<img>`: the smaller file as its
 * `src`, and both in its `srcset`, by width.
 *
 * @param {string} id - The body's id.
 * @param {string} base - The site's base path, such as `/site-interstellar/`.
 * @returns {{ src: string; srcset: string }} The URLs.
 *
 * @example
 * ```ts
 * getImageSources('saturn', '/');
 * // { src: '/images/bodies/saturn-360.webp',
 * //   srcset: '/images/bodies/saturn-360.webp 360w, /images/bodies/saturn-720.webp 720w' }
 * ```
 */
export const getImageSources = (
  id: string,
  base: string
): { src: string; srcset: string } => {
  const url = (width: number) => `${base}images/bodies/${id}-${width}.webp`;

  return {
    src: url(IMAGE_WIDTHS[0]),
    srcset: IMAGE_WIDTHS.map((width) => `${url(width)} ${width}w`).join(', ')
  };
};

/**
 * What an image's credit line says: who made it, the year, and the licence.
 * The licence and the source are links, made by the focus view.
 *
 * @param {BodyImageType} image - The image.
 * @returns {string} Such as `NASA, the Apollo 17 crew, 1972`.
 *
 * @example
 * ```ts
 * getCreditText(BODY_IMAGES.earth); // "NASA, the Apollo 17 crew, 1972"
 * ```
 */
export const getCreditText = ({ credit, year }: BodyImageType): string =>
  year ? `${credit}, ${year}` : credit;
