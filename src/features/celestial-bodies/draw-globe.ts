import { SIMULATION_DATE } from '../../config/constants';
import type { OrbitingBodyType } from '../../types/orbiting-bodies';
import { timeStep } from '../canvas/config/time-step';

import {
  getGlobeOrientation,
  getSpinPerFrame
} from './utils/get-globe-orientation';

/**
 * The bodies with a surface map, drawn as a turning globe in the focus view.
 * Each map is equirectangular, centred on 0° longitude with east to the
 * right, as `src/assets` copies it to the web root.
 */
const SURFACE_MAPS: Record<string, string> = {
  // Solar System Scope, CC BY 4.0: https://www.solarsystemscope.com/textures/
  mars: 'textures/mars.jpg'
};
/** The largest globe drawn, in device pixels, to bound the canvas's memory. */
const MAX_SIZE = 2048;
/**
 * The fastest turn shown, in degrees a frame. Faster, the frames strobe: a
 * turn just short of a whole one reads as a slow turn backwards.
 */
const MAX_SPIN_PER_FRAME = 30;

/** The body whose turn is held, and the date it is shown turned to. */
let held: { id: string; date: Date } | null = null;

const VERTEX = `#version 300 es
in vec2 corner;
out vec2 disc;
void main() {
  disc = corner;
  gl_Position = vec4(corner, 0.0, 1.0);
}`;
// Each pixel of the disc is traced to the sphere, turned into the body's
// frame and read off the map: no mesh, so no facets at any size
const FRAGMENT = `#version 300 es
precision highp float;
in vec2 disc;
uniform sampler2D map;
uniform mat3 toBody;
uniform vec3 sun;
uniform float pixel;
out vec4 color;
const float PI = 3.141592653589793;
void main() {
  float d = length(disc);
  if (d > 1.0) discard;
  vec3 normal = vec3(disc, sqrt(1.0 - d * d));
  vec3 p = toBody * normal;
  float u = atan(p.y, p.x) / (2.0 * PI) + 0.5;
  // The map's edges meet at 180°: read across the join from the other side
  // of it, so the mipmap level does not jump there
  float across = fract(u + 0.5) - 0.5;
  u = fwidth(u) <= fwidth(across) ? u : across;
  float v = 0.5 - asin(clamp(p.z, -1.0, 1.0)) / PI;
  vec3 albedo = pow(texture(map, vec2(u, v)).rgb, vec3(2.2));
  float light = max(dot(normal, sun), 0.0);
  vec3 lit = pow(albedo * (0.004 + 1.15 * light), vec3(1.0 / 2.2));
  float alpha = 1.0 - smoothstep(1.0 - 1.5 * pixel, 1.0, d);
  color = vec4(lit * alpha, alpha);
}`;

type GlobeRendererType = {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  uniforms: Record<'toBody' | 'sun' | 'pixel', WebGLUniformLocation | null>;
  /** Each body's map once it has loaded, `null` while it loads or if it failed. */
  maps: Map<string, WebGLTexture | null>;
};

/** `undefined` before the first try, `null` without WebGL 2. */
let renderer: GlobeRendererType | null | undefined;

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type)!;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'The globe shader failed');
  }

  return shader;
};
const createRenderer = (): GlobeRendererType | null => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true });

  if (!gl) return null;

  try {
    const program = gl.createProgram();

    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'The globe failed');
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const corner = gl.getAttribLocation(program, 'corner');

    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

    return {
      gl,
      canvas,
      uniforms: {
        toBody: gl.getUniformLocation(program, 'toBody'),
        sun: gl.getUniformLocation(program, 'sun'),
        pixel: gl.getUniformLocation(program, 'pixel')
      },
      maps: new Map()
    };
  } catch {
    // A driver that cannot build the shader keeps the flat discs
    return null;
  }
};
/** A body's map, loading it the first time it is asked for. */
const getMap = (
  { gl, maps }: GlobeRendererType,
  id: string,
  url: string
): WebGLTexture | null => {
  if (!maps.has(id)) {
    maps.set(id, null);

    const image = new Image();

    image.src = url;
    image
      .decode()
      .then(() => {
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGB,
          gl.RGB,
          gl.UNSIGNED_BYTE,
          image
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        maps.set(id, texture);
      })
      // Without its map the body keeps its flat disc
      .catch(() => undefined);
  }

  return maps.get(id) ?? null;
};

/**
 * Draws a body as a globe over its disc in the focus view: its surface map,
 * turned as it is at the simulation's date and lit from the Sun. When time
 * runs too fast for its turn to be shown (`MAX_SPIN_PER_FRAME`), the turn is
 * held where it was, while the light still follows the Sun.
 *
 * @param {CanvasRenderingContext2D} space - The canvas.
 * @param {number} x - The disc's centre, in CSS pixels.
 * @param {number} y - The disc's centre, in CSS pixels.
 * @param {number} r - The disc's radius, in CSS pixels.
 * @param {OrbitingBodyType} body - The body.
 * @returns {'turning' | 'held' | null} `'held'` when its turn is held,
 *   or `null` when it drew no globe: a body without a map, while the map
 *   loads, or without WebGL 2, so the caller can shade the flat disc instead.
 *
 * @example
 * ```ts
 * if (!drawGlobe(space, x, y, size, body)) drawShading(space, x, y, size, light);
 * ```
 */
export const drawGlobe = (
  space: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: OrbitingBodyType
): 'turning' | 'held' | null => {
  const url = SURFACE_MAPS[body.id];

  if (!url) return null;

  renderer ??= createRenderer();

  if (!renderer || renderer.gl.isContextLost()) return null;

  const tooFast =
    !globalThis.PAUSE &&
    getSpinPerFrame(body, timeStep.value) > MAX_SPIN_PER_FRAME;

  if (!tooFast) held = null;
  else if (held?.id !== body.id) {
    held = { id: body.id, date: new Date(SIMULATION_DATE) };
  }

  const map = getMap(renderer, body.id, url);
  const orientation =
    map && getGlobeOrientation(body, held?.date ?? SIMULATION_DATE);

  if (!map || !orientation) return null;

  const { gl, canvas, uniforms } = renderer;
  const size = Math.min(
    MAX_SIZE,
    Math.ceil(2 * r * (globalThis.devicePixelRatio || 1))
  );

  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  gl.viewport(0, 0, size, size);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D, map);
  // By rows, read as columns: the transpose, from the view into the body
  gl.uniformMatrix3fv(uniforms.toBody, false, orientation.toView.flat());
  gl.uniform3fv(uniforms.sun, orientation.sun);
  gl.uniform1f(uniforms.pixel, 2 / size);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  space.drawImage(canvas, x - r, y - r, r * 2, r * 2);

  return held ? 'held' : 'turning';
};
