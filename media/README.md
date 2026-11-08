# Media

Source recordings, kept at full quality. They are not part of the build: the
site serves compressed copies from `src/assets/`.

## `ambience.wav`

The background sound that plays when Sound is turned on (#99): 151 seconds, 48
kHz, 16-bit stereo, 29 MB.

It fades in over its first 8 seconds and dies away at its end, so played on
repeat it would dip to near silence at every join. The site plays a seamless
loop made from it instead: the last 8 seconds mixed over the first 8 and cut
from the end, 143.4 seconds long, served as:

| File                             | Format          | Size   | For                            |
| -------------------------------- | --------------- | ------ | ------------------------------ |
| `src/assets/audio/ambience.webm` | Opus, 64 kb/s   | 1.4 MB | Browsers that play Opus        |
| `src/assets/audio/ambience.m4a`  | AAC-LC, 96 kb/s | 1.8 MB | The rest, such as older Safari |

To make them again after changing the recording, make the loop, then encode it,
with GStreamer:

```sh
node scripts/make-ambience-loop.mjs media/ambience.wav ambience-loop.wav
gst-launch-1.0 filesrc location=ambience-loop.wav ! wavparse ! audioconvert \
  ! audioresample ! opusenc bitrate=64000 ! webmmux \
  ! filesink location=src/assets/audio/ambience.webm
gst-launch-1.0 filesrc location=ambience-loop.wav ! wavparse ! audioconvert \
  ! avenc_aac bitrate=96000 ! mp4mux faststart=true \
  ! filesink location=src/assets/audio/ambience.m4a
rm ambience-loop.wav
```

or with ffmpeg:

```sh
ffmpeg -i ambience-loop.wav -c:a libopus -b:a 64k src/assets/audio/ambience.webm
ffmpeg -i ambience-loop.wav -c:a aac -b:a 96k -movflags +faststart src/assets/audio/ambience.m4a
```

`OVERLAP` in the script sets how much of the end is mixed over the start.
