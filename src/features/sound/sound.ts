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
const AMBIENCE_VOLUME = 0.3;

/** Whether sound is on. Off on every visit: nothing is remembered. */
let enabled = false;
/**
 * Whether the page can be heard: shown, and its window in focus. Sound that
 * is on stays silent while someone is in another tab or window.
 */
let present = true;
/** The page's audio context, made the first time sound is turned on. */
let context: AudioContext | null = null;
/** When the last zoom tick played, in milliseconds, or `null` if none has. */
let lastTick: number | null = null;

/**
 * Plays clicks now, at a volume, while sound is on.
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
 * time sound is turned on, so nobody who leaves it off downloads it.
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
 * Ticks as the map zooms, while sound is on: at most one tick every
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
  if (!enabled) return;

  const now = performance.now();

  if (!isTickDue(now, lastTick)) return;

  lastTick = now;
  playClicks([getZoomTick(zoomingIn)], ZOOM_TICK_VOLUME);
};

/**
 * Sets up the Sound buttons: the one in the header on wide screens and the
 * one in the bottom bar on narrow screens, which stay in step through their
 * `aria-pressed` and on or off text.
 *
 * Sound is off on every visit and nothing is remembered. Turning it on plays
 * the ambience on a loop; while it is on, every Systems toggle, and the Sound
 * button itself, clicks like a switch as it is flicked, and zooming ticks
 * (see `playZoomTick`). Turning it off silences the page. While the page is
 * hidden, or its window is not in focus, it is silent too: the ambience
 * pauses and nothing clicks, until the page is back in focus.
 *
 * @param {Document} [root=document] - The document holding the buttons.
 *
 * @example
 * ```ts
 * setupSound();
 * ```
 */
export const setupSound = (root: Document = document): void => {
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>('button[data-sound]')
  ];

  let ambience: HTMLAudioElement | null = null;

  const playAmbience = () => {
    // A browser may refuse, or fail to load the file; the clicks still work
    if (present) ambience?.play().catch(() => undefined);
  };
  const setEnabled = (on: boolean) => {
    enabled = on;
    context ??= new AudioContext();

    if (context.state === 'suspended') void context.resume();

    playClicks(getSwitchClicks(on), SWITCH_VOLUME);
    ambience ??= createAmbience(root);

    if (on) playAmbience();
    else ambience.pause();

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(on));

      const state = button.querySelector('.mc-sound-state');

      if (state) state.textContent = on ? 'on' : 'off';
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => setEnabled(!enabled));
  }

  root.getElementById('options')?.addEventListener('change', ({ target }) => {
    if (
      enabled &&
      target instanceof HTMLInputElement &&
      target.type === 'checkbox'
    ) {
      playClicks(getSwitchClicks(target.checked), SWITCH_VOLUME);
    }
  });

  /** Silences the page while it is hidden or out of focus, and resumes after. */
  const followPresence = () => {
    present = !root.hidden && root.hasFocus();

    if (!enabled || !ambience) return;

    if (present) playAmbience();
    else ambience.pause();
  };

  present = !root.hidden && root.hasFocus();
  root.addEventListener('visibilitychange', followPresence);
  root.defaultView?.addEventListener('blur', followPresence);
  root.defaultView?.addEventListener('focus', followPresence);
};
