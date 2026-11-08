import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  LABEL_GAP,
  type LabelCandidateType,
  labelsCollide,
  placeLabels
} from '../utils/place-labels';

const HEIGHT = 20;
/** A monospaced label: 8 pixels a character, and 8 either side. */
const measure = (text: string) => text.length * 8 + 16;
const label = (
  id: string,
  x: number,
  bottom: number,
  priority: number
): LabelCandidateType => ({
  id,
  text: id.toUpperCase(),
  x,
  y: bottom + 24,
  bottom,
  priority
});

describe('labelsCollide', () => {
  const box = { left: 0, top: 0, width: 50, height: HEIGHT };

  test('counts boxes closer than the gap as colliding', () => {
    assert.equal(
      labelsCollide(box, { ...box, left: 50 + LABEL_GAP - 1 }),
      true
    );
    assert.equal(labelsCollide(box, { ...box, left: 50 + LABEL_GAP }), false);
    assert.equal(
      labelsCollide(box, { ...box, top: HEIGHT + LABEL_GAP }),
      false
    );
  });
});

describe('placeLabels', () => {
  test('never returns two labels that collide, and counts every one left out', () => {
    // A fixed seed, so a failure can be replayed
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;

      return seed / 2147483647;
    };

    for (let round = 0; round < 200; round++) {
      const candidates = Array.from({ length: 40 }, (_, i) =>
        label(
          `body${i}${'x'.repeat(Math.floor(random() * 8))}`,
          random() * 600,
          random() * 400,
          Math.floor(random() * 5)
        )
      );
      const placed = placeLabels(candidates, measure, HEIGHT);

      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          assert.equal(
            labelsCollide(placed[i].box, placed[j].box),
            false,
            `${placed[i].label} and ${placed[j].label} collide`
          );
        }
      }

      const hidden = placed.reduce((sum, { hidden }) => sum + hidden, 0);

      assert.equal(placed.length + hidden, candidates.length);
    }
  });

  test('keeps the larger body, which counts the label it hides', () => {
    const placed = placeLabels(
      [label('jupiter', 105, 100, 69_911), label('sun', 100, 100, 696_340)],
      measure,
      HEIGHT
    );

    assert.deepEqual(
      placed.map(({ label }) => label),
      ['SUN +1']
    );
    assert.equal(placed[0].box.width, measure('SUN +1'));
  });

  test('keeps the locked body over larger ones', () => {
    const placed = placeLabels(
      [
        label('sun', 100, 100, 696_340),
        label('halley', 110, 100, Infinity),
        label('jupiter', 90, 100, 69_911)
      ],
      measure,
      HEIGHT
    );

    assert.deepEqual(
      placed.map(({ label }) => label),
      ['HALLEY +2']
    );
  });

  test('draws labels that are clear of each other as they are', () => {
    const placed = placeLabels(
      [label('earth', 100, 100, 6371), label('mars', 300, 100, 3390)],
      measure,
      HEIGHT
    );

    assert.deepEqual(
      placed.map(({ label, hidden }) => [label, hidden]),
      [
        ['EARTH', 0],
        ['MARS', 0]
      ]
    );
  });

  test('a label widened by its count hides the neighbour it now reaches', () => {
    // SUN is 40 wide at 100 (80 to 120); NEPTUNE, 72 wide, sits just clear of
    // it; SUN +1 is 64 wide (68 to 132) and reaches NEPTUNE at 170 (134 to 206)
    const placed = placeLabels(
      [
        label('sun', 100, 100, 3),
        label('io', 100, 100, 1),
        label('neptune', 170, 100, 2)
      ],
      measure,
      HEIGHT
    );

    assert.equal(
      labelsCollide(
        placed[0].box,
        placeLabels([label('neptune', 170, 100, 2)], measure, HEIGHT)[0].box
      ),
      true
    );
    assert.deepEqual(
      placed.map(({ label }) => label),
      ['SUN +2']
    );
  });

  test("leaves out a label over another's claimed area, such as the lock reticle", () => {
    // SATURN's label, below the Sun, would sit on the Sun's reticle
    const sun = {
      ...label('sun', 100, 76, Infinity),
      area: { left: 80, top: 80, width: 40, height: 40 }
    };
    const placed = placeLabels(
      [sun, label('saturn', 100, 125, 58_232)],
      measure,
      HEIGHT
    );

    assert.deepEqual(
      placed.map(({ label }) => label),
      ['SUN +1']
    );
    // Without the area, both are drawn
    assert.equal(
      placeLabels(
        [label('sun', 100, 76, Infinity), label('saturn', 100, 125, 58_232)],
        measure,
        HEIGHT
      ).length,
      2
    );
  });

  test('breaks ties by id, whatever order the labels come in', () => {
    const a = label('a', 100, 100, 1);
    const b = label('b', 104, 100, 1);

    assert.equal(placeLabels([a, b], measure, HEIGHT)[0].id, 'a');
    assert.equal(placeLabels([b, a], measure, HEIGHT)[0].id, 'a');
  });
});
