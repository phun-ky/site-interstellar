import {
  type ClickType,
  getSwitchClicks,
  getZoomTick,
  isTickDue,
  SWITCH_VOLUME,
  ZOOM_TICK_VOLUME
} from './utils/clicks';
import { scheduleClick } from './utils/schedule-click';

/** The background sound, relative to the site: Opus, and AAC for browsers without Opus. */
const AMBIENCE_FILES = {
  opus: 'audio/ambience.webm',
  aac: 'audio/ambience.m4a'
} as const;
/** How loud the background sound plays, from 0 to 1: in the background. */
const AMBIENCE_VOLUME = 0.05;

/** The sounds that can be turned on in Settings, by the id of their switch. */
export const SOUND_SETTINGS = [
  { id: 'soundAmbience', label: 'Background ambience' },
  { id: 'soundClicks', label: 'Switch clicks' },
  { id: 'soundTicks', label: 'Zoom ticks' }
] as const;

type SoundSettingIdType = (typeof SOUND_SETTINGS)[number]['id'];

/** Which sounds are on. All off on every visit: nothing is remembered. */
const on: Record<SoundSettingIdType, boolean> = {
  soundAmbience: false,
  soundClicks: false,
  soundTicks: false
};

/**
 * Whether the page can be heard: shown, and its window in focus. Sound that
 * is on stays silent while someone is in another tab or window.
 */
let present = true;
/** The page's audio context, made the first time clicks or ticks are turned on. */
let context: AudioContext | null = null;
/** When the last zoom tick played, in milliseconds, or `null` if none has. */
let lastTick: number | null = null;

/**
 * Plays clicks now, at a volume, while the page can be heard.
 *
 * @param {ClickType[]} clicks - The clicks, timed from now.
 * @param {number} volume - The volume they play at.
 */
const playClicks = (clicks: ClickType[], volume: number): void => {
  if (!context || !present) return;

  const output = context.createGain();

  output.gain.value = volume;
  output.connect(context.destination);

  for (const click of clicks) {
    scheduleClick(context, output, click, context.currentTime);
  }
};
/**
 * The looping background sound, as an `<audio id="ambience">` at the end of
 * the page: Opus where the browser plays it, AAC elsewhere. Made the first
 * time the ambience is turned on, so nobody who leaves it off downloads it.
 *
 * @param {Document} root - The document to add it to.
 * @returns {HTMLAudioElement} The audio element.
 */
const createAmbience = (root: Document): HTMLAudioElement => {
  const audio = root.createElement('audio');
  const opus = audio.canPlayType('audio/webm; codecs="opus"') !== '';

  audio.id = 'ambience';
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = AMBIENCE_VOLUME;
  audio.src =
    import.meta.env.BASE_URL +
    (opus ? AMBIENCE_FILES.opus : AMBIENCE_FILES.aac);
  root.body.append(audio);

  return audio;
};

/**
 * Ticks as the map zooms, while zoom ticks are on: at most one tick every
 * `ZOOM_TICK_INTERVAL` milliseconds, so a fast wheel or pinch ticks evenly,
 * a little higher zooming in than zooming out.
 *
 * @param {boolean} zoomingIn - Whether the zoom is in, not out.
 *
 * @example
 * ```ts
 * playZoomTick(newScale > oldScale);
 * ```
 */
export const playZoomTick = (zoomingIn: boolean): void => {
  if (!on.soundTicks) return;

  const now = performance.now();

  if (!isTickDue(now, lastTick)) return;

  lastTick = now;
  playClicks([getZoomTick(zoomingIn)], ZOOM_TICK_VOLUME);
};

/**
 * Follows the sound switches in Settings (see `SOUND_SETTINGS`), each on its
 * own:
 *
 * - Background ambience plays a recording on a loop.
 * - Switch clicks make every switch, in Systems and in Settings, click like a
 *   toggle switch as it is flicked. Its own switch clicks as it is turned off,
 *   too, as the last sound it makes.
 * - Zoom ticks tick as the map zooms (see `playZoomTick`).
 *
 * All are off on every visit and nothing is remembered. While the page is
 * hidden, or its window is not in focus, it is silent: the ambience pauses
 * and nothing clicks, until the page is back in focus.
 *
 * @param {Document} [root=document] - The document holding the switches.
 *
 * @example
 * ```ts
 * setupSound();
 * ```
 */
export const setupSound = (root: Document = document): void => {
  let ambience: HTMLAudioElement | null = null;

  const playAmbience = () => {
    // A browser may refuse, or fail to load the file; the clicks still work
    if (present) ambience?.play().catch(() => undefined);
  };
  /** Turns one sound on or off, from its switch. */
  const set = (id: SoundSettingIdType, value: boolean) => {
    on[id] = value;

    if (id === 'soundAmbience') {
      ambience ??= createAmbience(root);

      if (value) playAmbience();
      else ambience.pause();
    } else if (value) {
      // Made and resumed in a click, which browsers require before any sound
      context ??= new AudioContext();

      if (context.state === 'suspended') void context.resume();
    }
  };

  root.addEventListener('change', ({ target }) => {
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
      return;
    }

    const setting = SOUND_SETTINGS.find(({ id }) => id === target.id);

    if (setting) set(setting.id, target.checked);

    if (on.soundClicks || target.id === 'soundClicks') {
      playClicks(getSwitchClicks(target.checked), SWITCH_VOLUME);
    }
  });

  /** Silences the page while it is hidden or out of focus, and resumes after. */
  const followPresence = () => {
    present = !root.hidden && root.hasFocus();

    if (!on.soundAmbience || !ambience) return;

    if (present) playAmbience();
    else ambience.pause();
  };

  present = !root.hidden && root.hasFocus();
  root.addEventListener('visibilitychange', followPresence);
  root.defaultView?.addEventListener('blur', followPresence);
  root.defaultView?.addEventListener('focus', followPresence);
};
