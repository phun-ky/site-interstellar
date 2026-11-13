import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { AU_PER_LY } from '@interstellar-tools/constants';

import { OrbitingBodyType } from '../../../types/orbiting-bodies';
import { findBodyById } from '../../celestial-bodies/utils/body-catalog';

import {
  getMinimapContext,
  MILKY_WAY_RADIUS_AU,
  type MinimapContextType
} from '../utils/get-minimap-context';
import {
  placeLabel,
  toGalaxyMap,
  toNeighbourMap
} from '../utils/minimap-projection';

const body = (id: string): OrbitingBodyType => {
  const found = findBodyById(id);

  assert.ok(found, `${id} is in the catalogue`);

  return found as OrbitingBodyType;
};
const centreAu = { x: 1, y: 2 };
const lockedAu = { x: 3, y: 4 };
/** The context for a lock (or none) and how wide the map is, in au. */
const context = (id: string | null, halfWidthAu: number): MinimapContextType =>
  getMinimapContext({
    locked: id ? body(id) : null,
    halfWidthAu,
    centreAu,
    lockedAu
  });
/** A system context's centre, marked body and rings, for short asserts. */
const system = (result: MinimapContextType) => {
  assert.equal(result.kind, 'system');

  const { centre, focus, rings } = result.system;

  return {
    centre: centre.id,
    focus: focus.id,
    rings: rings.map(({ id }) => id)
  };
};

describe('getMinimapContext', () => {
  test('at solar system scale, the Sun is marked in the Milky Way', () => {
    assert.deepEqual(context('sun', 60), {
      kind: 'galaxy',
      marker: lockedAu,
      name: 'Sun'
    });
  });

  test('closer in than Neptune, the Sun shows its planets', () => {
    const { centre, focus } = system(context('sun', 10));

    assert.equal(centre, 'sun');
    assert.equal(focus, 'sun');
  });

  test('a planet is marked among the planets', () => {
    const { centre, focus, rings } = system(context('jupiter', 0.05));

    assert.equal(centre, 'sun');
    assert.equal(focus, 'jupiter');
    assert.ok(rings.includes('jupiter'));
  });

  test("a moon is marked among its planet's moons, and the planet among the planets further out", () => {
    assert.equal(system(context('io', 0.005)).centre, 'jupiter');

    const wider = system(context('io', 1));

    assert.equal(wider.centre, 'sun');
    assert.equal(wider.focus, 'jupiter');
  });

  test('an asteroid is added among the planets, to be marked', () => {
    const { centre, focus, rings } = system(context('ceres', 1));

    assert.equal(centre, 'sun');
    assert.equal(focus, 'ceres');
    assert.deepEqual(rings.slice(3, 6), ['mars', 'ceres', 'jupiter']);
  });

  test("beyond a system's reach, it climbs to the Milky Way", () => {
    // Neptune's orbit is 30 au; the map shows 100 au each way
    assert.deepEqual(context('jupiter', 100), {
      kind: 'galaxy',
      marker: lockedAu,
      name: 'Jupiter'
    });
  });

  test('with nothing locked, the marker is the middle of the map', () => {
    assert.deepEqual(context(null, 100), {
      kind: 'galaxy',
      marker: centreAu,
      name: null
    });
  });

  test('past half the Milky Way, its neighbours; a locked galaxy is marked among them', () => {
    assert.deepEqual(context(null, MILKY_WAY_RADIUS_AU * 0.6), {
      kind: 'neighbours',
      focusId: 'milky-way'
    });
    assert.deepEqual(context('andromeda', 1), {
      kind: 'neighbours',
      focusId: 'andromeda'
    });
  });
});

describe('the Milky Way on the minimap', () => {
  test('puts its centre in the middle, and its disc within the edge', () => {
    assert.deepEqual(toGalaxyMap({ x: 0, y: 0 }, 160), { x: 80, y: 80 });

    const edge = toGalaxyMap({ x: MILKY_WAY_RADIUS_AU, y: 0 }, 160);

    assert.ok(edge.x > 140 && edge.x < 160, `${edge.x} is near the edge`);
  });

  test("puts the Sun's 27,000 ly out at its share of the radius", () => {
    const { x } = toGalaxyMap({ x: 27_000 * AU_PER_LY, y: 0 }, 160);

    assert.ok(Math.abs(x - 80 - 80 * 0.88 * (27_000 / 43_705)) < 0.1);
  });
});

describe('the neighbours on the minimap', () => {
  const reach: [number, number] = [100, 10_000];

  test('places the nearest on the inner ring and the farthest on the outer, on a log scale', () => {
    const near = toNeighbourMap({ x: 100, y: 0 }, 160, reach);
    const middle = toNeighbourMap({ x: 1000, y: 0 }, 160, reach);
    const far = toNeighbourMap({ x: 10_000, y: 0 }, 160, reach);

    assert.ok(Math.abs(near.x - (80 + 80 * 0.32)) < 1e-9);
    assert.ok(Math.abs(far.x - (80 + 80 * 0.88)) < 1e-9);
    // Ten times as far is halfway out, on a log scale
    assert.ok(Math.abs(middle.x - (near.x + far.x) / 2) < 1e-9);
  });

  test('keeps the direction', () => {
    const { x, y } = toNeighbourMap({ x: 0, y: -1000 }, 160, reach);

    assert.ok(Math.abs(x - 80) < 1e-9);
    assert.ok(y < 80);
  });
});

describe('placeLabel', () => {
  test('puts a name on the side facing the middle when it fits', () => {
    assert.deepEqual(placeLabel({ x: 40, y: 80 }, 60, 160), {
      x: 50,
      y: 80,
      align: 'left'
    });
    assert.deepEqual(placeLabel({ x: 120, y: 80 }, 60, 160), {
      x: 110,
      y: 80,
      align: 'right'
    });
  });

  test('tries the other side, then under the marker, near the narrow top', () => {
    // Betelgeuse, near the top: neither side has room for its name
    assert.deepEqual(placeLabel({ x: 81, y: 37 }, 70, 160), {
      x: 81,
      y: 51,
      align: 'center'
    });
    // Near the bottom it goes over the marker instead
    assert.equal(placeLabel({ x: 81, y: 130 }, 140, 160).y, 116);
  });
});
