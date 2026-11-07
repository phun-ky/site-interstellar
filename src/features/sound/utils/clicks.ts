/** One click: a burst of noise narrowed to a band, timed from the moment it plays. */
export type ClickType = {
  /** The middle of the band, in hertz: higher sounds smaller and sharper. */
  frequency: number;
  /** How narrow the band is: higher is more pitched, lower is more like a tap. */
  q: number;
  /** When the click starts, in seconds after the sound starts. */
  start: number;
  /** How long it takes to die away, in seconds. */
  duration: number;
  /** How loud, from 0 to 1, before the sound's own volume. */
  gain: number;
};

/**
 * How loud a switch sounds. A narrow band of noise carries little energy, so
 * this lifts it to peaks of about a sixth of full scale.
 */
export const SWITCH_VOLUME = 1.4;

/** How loud a zoom tick sounds: barely there, at peaks of about a hundredth of full scale. */
export const ZOOM_TICK_VOLUME = 0.2;

/** The two bands a switch's clicks are in. */
const LOW = 1800;
const HIGH = 3200;

/**
 * The clicks of a switch: the press, then the softer release, like a toggle
 * switch on a console. The release is higher when it is switched on and lower
 * when it is switched off.
 *
 * @param {boolean} on - Whether the switch was turned on.
 * @returns {ClickType[]} The press, then the release.
 *
 * @example
 * ```ts
 * getSwitchClicks(true); // 1800 Hz, then 3200 Hz
 * ```
 */
export const getSwitchClicks = (on: boolean): ClickType[] => {
  const [press, release] = on ? [LOW, HIGH] : [HIGH, LOW];
  // A wider band (a higher one, at the same Q) carries more of the noise, so
  // it is turned down to sound as loud as the lower one
  const balanced = (frequency: number, gain: number) =>
    gain * Math.sqrt(LOW / frequency);

  return [
    {
      frequency: press,
      q: 6,
      start: 0,
      duration: 0.012,
      gain: balanced(press, 1)
    },
    {
      frequency: release,
      q: 6,
      start: 0.035,
      duration: 0.008,
      gain: balanced(release, 0.6)
    }
  ];
};

/** The shortest gap between zoom ticks, in milliseconds, however fast the wheel turns. */
export const ZOOM_TICK_INTERVAL = 80;

/**
 * The tick zooming makes: shorter, higher and quieter than a switch, a little
 * higher zooming in than zooming out.
 *
 * @param {boolean} zoomingIn - Whether the zoom is in, not out.
 * @returns {ClickType} The tick.
 *
 * @example
 * ```ts
 * getZoomTick(true); // 5200 Hz
 * ```
 */
export const getZoomTick = (zoomingIn: boolean): ClickType => ({
  frequency: zoomingIn ? 5200 : 4200,
  q: 8,
  start: 0,
  duration: 0.005,
  gain: 0.5
});

/**
 * Whether a zoom tick may play now: the first one always may, later ones once
 * `ZOOM_TICK_INTERVAL` has passed since the last, so a fast wheel ticks evenly.
 *
 * @param {number} now - The time now, in milliseconds.
 * @param {number | null} last - When the last tick played, or `null` if none has.
 * @returns {boolean} Whether to tick.
 *
 * @example
 * ```ts
 * isTickDue(1000, 950); // false: only 50 ms since the last
 * ```
 */
export const isTickDue = (now: number, last: number | null): boolean =>
  last === null || now - last >= ZOOM_TICK_INTERVAL;
