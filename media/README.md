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

## Body images

The focus view shows a picture of the body (#126): a photograph or image from a
spacecraft or telescope, or a labelled artist's impression. Each is served from
`src/assets/images/bodies/` at two sizes, `<id>-360.webp` and `<id>-720.webp`,
the whole image fitted inside a square that many pixels wide (never cropped to
it, so Saturn's rings and Andromeda's disc fit), and listed with its caption,
description, credit, licence and source in
`src/features/ui/utils/body-images.ts`.

To add one:

1. Find it on Wikimedia Commons, and check its licence: public domain, or a
   Creative Commons licence that allows reuse (CC BY or CC BY-SA). An artist's
   impression is allowed, marked `impression: true`; an image of another body is
   not.
2. Download it at about 1200 px wide, and crop away only borders, captions and
   scale bars.
3. Save it at both sizes, fitted inside the square, as WebP at quality 78, for
   example with Pillow:

   ```python
   from PIL import Image

   image = Image.open('saturn.jpg').convert('RGB')
   for size in (720, 360):
       copy = image.copy()
       copy.thumbnail((size, size), Image.LANCZOS)
       copy.save(f'src/assets/images/bodies/saturn-{size}.webp', 'WEBP',
                 quality=78, method=6)
   ```

4. Add its entry, keyed by the body's id, with the 720 px file's width and
   height. The tests check that every entry is a body, has both files at the
   size it gives, and has a credit, a licence and a Commons source.

An image under CC BY-SA is shared under the same licence after resizing, as its
credit line says.
