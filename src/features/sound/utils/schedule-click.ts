import type { ClickType } from './clicks';

/** One noise buffer per audio context, made once and shared by every click. */
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
/** Long enough for the longest click to die away. */
const NOISE_DURATION = 0.05;
/**
 * Fills `samples` with the same white noise every time, from a fixed seed
 * (xorshift32), so every click sounds alike, and as loud, on every visit.
 *
 * @param {Float32Array} samples - Where the noise goes, from -1 to 1.
 */
const fillFixedNoise = (samples: Float32Array): void => {
  let state = 0x9e3779b9;

  for (let i = 0; i < samples.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    samples[i] = (state >>> 0) / 0x7fffffff - 1;
  }
};
/**
 * White noise for the clicks, made once per audio context.
 *
 * @param {BaseAudioContext} context - The audio context.
 * @returns {AudioBuffer} The noise.
 */
const getNoise = (context: BaseAudioContext): AudioBuffer => {
  const cached = noiseBuffers.get(context);

  if (cached) return cached;

  const length = Math.ceil(context.sampleRate * NOISE_DURATION);
  const noise = context.createBuffer(1, length, context.sampleRate);

  fillFixedNoise(noise.getChannelData(0));

  noiseBuffers.set(context, noise);

  return noise;
};

/**
 * Plays one click at `at`: noise through a band-pass filter, at full strength
 * at once and dying away over the click's duration. Works with an
 * `AudioContext` for the page, or an `OfflineAudioContext` to render one.
 *
 * @param {BaseAudioContext} context - The audio context.
 * @param {AudioNode} destination - Where the click goes.
 * @param {ClickType} click - The click.
 * @param {number} at - When the sound starts, in the context's time.
 *
 * @example
 * ```ts
 * scheduleClick(context, context.destination, getZoomTick(true), context.currentTime);
 * ```
 */
export const scheduleClick = (
  context: BaseAudioContext,
  destination: AudioNode,
  { frequency, q, start, duration, gain }: ClickType,
  at: number
): void => {
  const when = at + start;
  const source = context.createBufferSource();
  const band = context.createBiquadFilter();
  const envelope = context.createGain();

  source.buffer = getNoise(context);
  band.type = 'bandpass';
  band.frequency.value = frequency;
  band.Q.value = q;
  envelope.gain.setValueAtTime(gain, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(band).connect(envelope).connect(destination);
  source.start(when);
  source.stop(when + duration + 0.005);
};
