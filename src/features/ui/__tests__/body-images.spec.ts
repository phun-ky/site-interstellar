import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { findBodyById } from '../../celestial-bodies/utils/body-catalog';
import {
  BODY_IMAGES,
  getBodyImage,
  getCreditText,
  getImageSources,
  IMAGE_WIDTHS,
  LICENCE_URLS
} from '../utils/body-images';

const FOLDER = new URL('../../../assets/images/bodies/', import.meta.url);
const ENTRIES = Object.entries(BODY_IMAGES);

/** A lossy WebP file's width and height, from its VP8 frame header. */
const webpSize = (file: URL) => {
  const data = readFileSync(file);

  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${file} is a RIFF`);
  assert.equal(data.toString('ascii', 8, 16), 'WEBPVP8 ', `${file} is lossy`);

  return {
    width: data.readUInt16LE(26) & 0x3fff,
    height: data.readUInt16LE(28) & 0x3fff
  };
};

describe('the body images (#126)', () => {
  test('are each of a body in the catalogue', () => {
    for (const [id] of ENTRIES) {
      assert.ok(findBodyById(id), `${id} is not a body`);
    }
  });

  test('each has a caption, a description, a credit, a licence and a source', () => {
    for (const [id, image] of ENTRIES) {
      assert.ok(image.title.length > 2, `${id} has no title`);
      assert.ok(image.alt.length > 20, `${id} has no description`);
      assert.ok(image.credit.length > 2, `${id} has no credit`);
      assert.ok(image.licence in LICENCE_URLS, `${id}'s licence is unknown`);
      assert.match(
        image.source,
        /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
        `${id}'s source`
      );
    }
  });

  test('are served at both widths, the size the list gives, whole inside each', () => {
    for (const [id, image] of ENTRIES) {
      for (const width of IMAGE_WIDTHS) {
        const file = new URL(`${id}-${width}.webp`, FOLDER);

        assert.ok(existsSync(file), `${id}-${width}.webp is missing`);

        const size = webpSize(file);

        assert.ok(
          Math.max(size.width, size.height) <= width,
          `${id}-${width}.webp is ${size.width} x ${size.height}`
        );

        if (width === 720) {
          assert.deepEqual(
            size,
            { width: image.width, height: image.height },
            id
          );
        }
      }
    }
  });

  test("labels only ʻOumuamua's image as an artist's impression", () => {
    assert.deepEqual(
      ENTRIES.filter(([, image]) => image.impression).map(([id]) => id),
      ['1i-oumuamua']
    );
  });

  test('covers the planets, the black holes and the interstellar objects', () => {
    for (const id of [
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'sagittarius-a-star',
      'm87-star',
      '1i-oumuamua',
      '2i-borisov',
      '3i-atlas'
    ]) {
      assert.ok(getBodyImage(id), `${id} has no image`);
    }
  });
});

describe('getBodyImage', () => {
  test('finds a body by its own id only, and nothing for one without', () => {
    assert.equal(getBodyImage('saturn')?.title, 'Saturn at equinox');
    assert.equal(getBodyImage('s2'), undefined);
    assert.equal(getBodyImage('toString'), undefined);
  });
});

describe('getImageSources', () => {
  test('gives the smaller file, and both by width, under the base path', () => {
    assert.deepEqual(getImageSources('saturn', '/site-interstellar/'), {
      src: '/site-interstellar/images/bodies/saturn-360.webp',
      srcset:
        '/site-interstellar/images/bodies/saturn-360.webp 360w, /site-interstellar/images/bodies/saturn-720.webp 720w'
    });
  });
});

describe('getCreditText', () => {
  test('adds the year where it is known', () => {
    assert.equal(
      getCreditText(BODY_IMAGES.earth),
      'NASA, the Apollo 17 crew, 1972'
    );
    assert.equal(
      getCreditText(BODY_IMAGES.saturn),
      'NASA / JPL / Space Science Institute (Cassini)'
    );
  });
});

describe('LICENCE_URLS', () => {
  test('links each Creative Commons licence to its deed, and not the public domain', () => {
    assert.equal(LICENCE_URLS['Public domain'], null);

    for (const [licence, url] of Object.entries(LICENCE_URLS)) {
      if (licence !== 'Public domain') {
        assert.match(url ?? '', /^https:\/\/creativecommons\.org\/licenses\//);
      }
    }
  });
});
