import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  groupByOverlap,
  groupBySystem,
  type StarPointType,
  type SystemPointType,
  toMarkers
} from '../star-groups';

const star = (
  id: string,
  x: number,
  rank: number,
  systems: string[] = [],
  size = 4
): StarPointType => ({ id, x, y: 0, size, rank, systems });
const system = (id: string, x: number): SystemPointType => ({
  id,
  name: id.toUpperCase(),
  x,
  y: 0
});
// Alpha Centauri: A and B in AB, with Proxima beside them
const AB = ['alpha-centauri-ab', 'alpha-centauri'];
const SYSTEMS = [
  system('alpha-centauri-ab', 101),
  system('alpha-centauri', 100)
];
const ids = (members: StarPointType[]) => members.map(({ id }) => id).sort();

describe('groupBySystem', () => {
  test('draws a system whose stars overlap as one, where the system is', () => {
    const markers = groupBySystem(
      toMarkers([
        star('a', 100, 2, AB),
        star('b', 102, 1, AB),
        star('proxima', 130, 0.1, ['alpha-centauri'])
      ]),
      SYSTEMS
    );

    assert.equal(markers.length, 2);

    const ab = markers.find(({ system }) => system?.id === 'alpha-centauri-ab');

    assert.ok(ab);
    assert.deepEqual(ids(ab.members), ['a', 'b']);
    assert.equal(ab.lead.id, 'a');
    assert.equal(ab.x, 101);
    assert.equal(ab.named, 2);
    // Now a star of Alpha Centauri, beside Proxima, which is clear of it
    assert.deepEqual(ab.systems, ['alpha-centauri']);
  });

  test('goes out a system at a time, while what is in it overlaps', () => {
    const markers = groupBySystem(
      toMarkers([
        star('a', 100, 2, AB),
        star('b', 102, 1, AB),
        star('proxima', 106, 0.1, ['alpha-centauri'])
      ]),
      SYSTEMS
    );

    assert.equal(markers.length, 1);
    assert.equal(markers[0].system?.id, 'alpha-centauri');
    assert.deepEqual(ids(markers[0].members), ['a', 'b', 'proxima']);
    assert.equal(markers[0].named, 3);
  });

  test('leaves a system whose stars are apart as its stars', () => {
    const markers = groupBySystem(
      toMarkers([star('a', 100, 2, AB), star('b', 120, 1, AB)]),
      SYSTEMS
    );

    assert.deepEqual(
      markers.map(({ lead, system }) => [lead.id, system]),
      [
        ['a', undefined],
        ['b', undefined]
      ]
    );
  });
});

describe('groupByOverlap', () => {
  test('draws overlapping stars as the highest ranked, counting them all', () => {
    // Each touches the next: one group, led by the Sun, drawn where it is
    const markers = groupByOverlap(
      toMarkers([
        star('vega', 106, 3),
        star('sun', 100, 9),
        star('altair', 112, 5),
        star('deneb', 200, 8)
      ])
    );

    assert.equal(markers.length, 2);

    const [sun, deneb] = markers;

    assert.equal(sun.lead.id, 'sun');
    assert.equal(sun.x, 100);
    assert.deepEqual(ids(sun.members), ['altair', 'sun', 'vega']);
    assert.equal(sun.named, 1);
    assert.deepEqual(ids(deneb.members), ['deneb']);
  });

  test('keeps a system drawn as one whole within a group', () => {
    const [marker] = groupByOverlap(
      groupBySystem(
        toMarkers([
          star('sun', 98, 9),
          star('a', 100, 2, AB),
          star('b', 102, 1, AB)
        ]),
        SYSTEMS
      )
    );

    // Led by the Sun, which names one of its three stars
    assert.equal(marker.lead.id, 'sun');
    assert.equal(marker.system, undefined);
    assert.equal(marker.members.length, 3);
    assert.equal(marker.named, 1);
  });

  test('leaves stars that are apart as they are', () => {
    const markers = groupByOverlap(
      toMarkers([star('sun', 100, 9), star('vega', 108, 3)])
    );

    assert.deepEqual(
      markers.map(({ members }) => members.length),
      [1, 1]
    );
  });
});
