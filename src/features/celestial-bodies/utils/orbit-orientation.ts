import {
  convertDistanceUnit,
  orbitFrameToIcrf
} from '@interstellar-tools/equations';
import { OpenOrbitInterface, OrbitInterface } from '@interstellar-tools/types';

/** A closed orbit, or an open one (an interstellar object's). */
export type AnyOrbitType = OrbitInterface | OpenOrbitInterface;

/**
 * Whether an orbit is open, an interstellar object's hyperbola: it has a
 * periapsis time and no period.
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @returns {boolean} Whether it is open.
 *
 * @example
 * ```ts
 * isOpenOrbit(oumuamua.orbit); // true
 * ```
 */
export const isOpenOrbit = (orbit: AnyOrbitType): orbit is OpenOrbitInterface =>
  'periapsisTime' in orbit;

/** A 3D vector, in au. */
export type Vector3Type = [x: number, y: number, z: number];

/** A 3x3 matrix, by rows. */
export type Matrix3Type = [Vector3Type, Vector3Type, Vector3Type];

const DEGREES = Math.PI / 180;
/** The J2000 obliquity of the ecliptic, 84 381.448″, as equations uses it. */
const OBLIQUITY = (84_381.448 / 3600) * DEGREES;
const multiply = (a: Matrix3Type, b: Matrix3Type): Matrix3Type =>
  a.map((row) =>
    [0, 1, 2].map((column) =>
      row.reduce((sum, value, k) => sum + value * b[k][column], 0)
    )
  ) as Matrix3Type;
const transpose = (m: Matrix3Type): Matrix3Type =>
  [0, 1, 2].map((row) => m.map((column) => column[row])) as Matrix3Type;

/**
 * Applies a matrix to a vector.
 *
 * @param {Matrix3Type} m - The matrix.
 * @param {Vector3Type} v - The vector.
 * @returns {Vector3Type} `m` times `v`.
 *
 * @example
 * ```ts
 * applyMatrix(getOrbitRotation(orbit), [1, 0, 0]); // the direction of periapsis
 * ```
 */
export const applyMatrix = (m: Matrix3Type, v: Vector3Type): Vector3Type =>
  m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vector3Type;

/** A turn about the x axis, by an angle in radians. */
const aboutX = (angle: number): Matrix3Type => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];

  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
};
/** A turn about the z axis, by an angle in radians. */
const aboutZ = (angle: number): Matrix3Type => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];

  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
};

/**
 * The inclination of an orbit, in degrees: its `i`, or, without one, 180°
 * for a retrograde orbit and 0° otherwise, as equations' `stateAt` reads it.
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @returns {number} The inclination, in degrees.
 *
 * @example
 * ```ts
 * getInclination({ ...orbit, i: undefined, retrograde: true }); // 180
 * ```
 */
export const getInclination = ({ i, retrograde }: AnyOrbitType): number =>
  i ?? (retrograde ? 180 : 0);

/**
 * The rotation from an orbit's perifocal frame (x towards periapsis, z along
 * its angular momentum) to its reference plane (`orbit.frame`):
 * $R_3(\Omega) R_1(i) R_3(\omega)$. A missing node or periapsis counts as 0.
 *
 * With `flat`, the inclination is 0° or 180°: the orbit is laid in its
 * reference plane, turned to its real direction, and runs backwards when it
 * is retrograde. That is how the 2D map draws orbits (#105).
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @param {{ flat?: boolean }} [options] - Whether to lay the orbit flat.
 * @returns {Matrix3Type} The rotation.
 *
 * @example
 * ```ts
 * applyMatrix(getOrbitRotation(pluto.orbit), [1, 0, 0]); // Pluto's periapsis direction
 * ```
 */
export const getOrbitRotation = (
  orbit: AnyOrbitType,
  { flat = false }: { flat?: boolean } = {}
): Matrix3Type => {
  const inclination = getInclination(orbit);
  const i = flat ? (inclination > 90 ? 180 : 0) : inclination;

  return multiply(
    multiply(aboutZ((orbit.om ?? 0) * DEGREES), aboutX(i * DEGREES)),
    aboutZ((orbit.w ?? 0) * DEGREES)
  );
};

/**
 * Where a body is in its orbit's perifocal frame, in au: periapsis along x,
 * at a true anomaly. Works for open orbits too, whose `a` is negative.
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @param {number} [trueAnomaly=orbit.angle] - The true anomaly, in radians.
 * @returns {Vector3Type} The position, with z 0.
 *
 * @example
 * ```ts
 * getPerifocalPosition(earth.orbit, 0); // [0.983, 0, 0]: perihelion
 * ```
 */
export const getPerifocalPosition = (
  orbit: AnyOrbitType,
  trueAnomaly: number = orbit.angle
): Vector3Type => {
  const a = convertDistanceUnit(orbit.a, 'au').value;
  const { e } = orbit;
  const r = (a * (1 - e ** 2)) / (1 + e * Math.cos(trueAnomaly));

  return [r * Math.cos(trueAnomaly), r * Math.sin(trueAnomaly), 0];
};

/**
 * Where a body is relative to its parent, in au, in 3D, in its orbit's
 * reference plane: tilted by its inclination and turned by its node and
 * periapsis. For a 3D view; the 2D map lays orbits flat (#105).
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @returns {Vector3Type} The position.
 *
 * @example
 * ```ts
 * getOrbitPosition3D(pluto.orbit)[2]; // Pluto's height above the ecliptic, in au
 * ```
 */
export const getOrbitPosition3D = (orbit: AnyOrbitType): Vector3Type =>
  applyMatrix(getOrbitRotation(orbit), getPerifocalPosition(orbit));

/**
 * Where a body is relative to its parent, in au, in the J2000 ecliptic frame,
 * whatever plane its orbit is measured in: its reference plane is turned into
 * the ICRF with equations' `orbitFrameToIcrf`, then into the ecliptic. For a
 * 3D view, with every orbit in one frame.
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @returns {Vector3Type | null} The position, or `null` when the orbit's plane can't be placed
 * yet: no `frame`, or a `'sky'` or `'galactic'` one.
 *
 * @example
 * ```ts
 * getEclipticPosition(titan.orbit); // Titan from Saturn, in the ecliptic frame
 * ```
 */
export const getEclipticPosition = (
  orbit: AnyOrbitType
): Vector3Type | null => {
  const { frame } = orbit;

  if (!frame || frame.plane === 'sky' || frame.plane === 'galactic') {
    return null;
  }

  const toEcliptic = multiply(
    transpose(aboutX(OBLIQUITY)),
    orbitFrameToIcrf(frame) as Matrix3Type
  );

  return applyMatrix(toEcliptic, getOrbitPosition3D(orbit));
};

/**
 * Where a body is drawn relative to its parent on the 2D map, in au: its
 * orbit laid flat and turned to its real direction (#105), on the canvas,
 * where y runs down, so prograde orbits run counter-clockwise.
 *
 * @param {AnyOrbitType} orbit - The orbit.
 * @param {number} [trueAnomaly=orbit.angle] - The true anomaly, in radians.
 * @returns {[x: number, y: number]} The position, in au.
 *
 * @example
 * ```ts
 * getFlatPosition(earth.orbit);
 * ```
 */
export const getFlatPosition = (
  orbit: AnyOrbitType,
  trueAnomaly: number = orbit.angle
): [x: number, y: number] => {
  const [x, y] = applyMatrix(
    getOrbitRotation(orbit, { flat: true }),
    getPerifocalPosition(orbit, trueAnomaly)
  );

  return [x, -y];
};
