// Make a seamless loop of the ambience recording, for the site to play with
// <audio loop>. The recording fades in over its first 8 seconds and dies away
// at its end, so played on repeat it dips to near silence at every join. Here
// its last OVERLAP seconds are mixed over its first OVERLAP seconds and cut
// from the end: the end then runs straight on into the start.
//
// Usage: node scripts/make-ambience-loop.mjs [source.wav] [loop.wav]
// Encode the loop as media/README.md describes.
import { readFileSync, writeFileSync } from 'node:fs';

const [source = 'media/ambience.wav', target = 'ambience-loop.wav'] =
  process.argv.slice(2);
/** How much of the end is mixed over the start, in seconds: the fade-in's length. */
const OVERLAP = 8;
const wav = readFileSync(source);
/** The offset and size of a RIFF chunk, by its id. */
const findChunk = (id) => {
  for (let offset = 12; offset < wav.length - 8;) {
    const size = wav.readUInt32LE(offset + 4);

    if (wav.toString('ascii', offset, offset + 4) === id) {
      return { start: offset + 8, size };
    }

    offset += 8 + size + (size % 2);
  }

  throw new Error(`${source} has no "${id}" chunk`);
};
const format = findChunk('fmt ');
const channels = wav.readUInt16LE(format.start + 2);
const rate = wav.readUInt32LE(format.start + 4);
const bits = wav.readUInt16LE(format.start + 14);

if (wav.readUInt16LE(format.start) !== 1 || bits !== 16) {
  throw new Error(`${source} is not 16-bit PCM`);
}

const data = findChunk('data');
const samples = new Int16Array(
  wav.buffer.slice(
    wav.byteOffset + data.start,
    wav.byteOffset + data.start + data.size
  )
);
const overlap = OVERLAP * rate * channels;
const length = samples.length - overlap;
const loop = samples.slice(0, length);

// The end, mixed over the start; the recording's own fades make the crossfade
for (let i = 0; i < overlap; i++) {
  loop[i] = Math.max(-32768, Math.min(32767, loop[i] + samples[length + i]));
}

const header = Buffer.alloc(44);

header.write('RIFF', 0, 'ascii');
header.writeUInt32LE(36 + loop.byteLength, 4);
header.write('WAVEfmt ', 8, 'ascii');
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36, 'ascii');
header.writeUInt32LE(loop.byteLength, 40);
writeFileSync(target, Buffer.concat([header, Buffer.from(loop.buffer)]));

console.log(
  `${target}: ${(length / channels / rate).toFixed(1)} s, looping seamlessly (the last ${OVERLAP} s of ${source} mixed over its start)`
);
