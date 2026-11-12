import { ArrowBoundsType } from './get-arrow-position';

/** Below this clear width (in CSS pixels) the panels cover too much, so focusing frames against the whole canvas. */
const MIN_CLEAR_WIDTH = 240;

/**
 * Measures the clear part of the viewport between the HUD's side panels
 * (`.mc-left` and `.controls`), in canvas pixels: used to frame a body when
 * focusing on it. When the panels leave too little room (a narrow window), or
 * are missing, the whole canvas is returned.
 *
 * @param {HTMLCanvasElement} canvas - The simulation canvas.
 * @param {number} canvasWidth - The canvas width used for drawing.
 * @param {number} canvasHeight - The canvas height used for drawing.
 * @returns {ArrowBoundsType} The clear area, in the same pixels as `canvasWidth`.
 *
 * @example
 * ```ts
 * const bounds = getClearBounds(canvas, canvas.clientWidth, canvas.clientHeight);
 * ```
 */
export const getClearBounds = (
  canvas: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number
): ArrowBoundsType => {
  const full = { left: 0, top: 0, right: canvasWidth, bottom: canvasHeight };
  const canvasRect = canvas.getBoundingClientRect();

  if (!canvasRect.width) return full;

  // Panels are measured in CSS pixels; the drawing may use device pixels
  const toCanvas = canvasWidth / canvasRect.width;
  const leftPanel = document.querySelector('.mc-left');
  const rightPanel = document.querySelector('.int.controls');
  const leftCSS = leftPanel
    ? leftPanel.getBoundingClientRect().right - canvasRect.left
    : 0;
  const rightCSS = rightPanel
    ? rightPanel.getBoundingClientRect().left - canvasRect.left
    : canvasRect.width;
  const centerCSS = canvasRect.width / 2;

  if (
    rightCSS - leftCSS < MIN_CLEAR_WIDTH ||
    leftCSS >= centerCSS ||
    rightCSS <= centerCSS
  ) {
    return full;
  }

  return {
    left: Math.max(0, leftCSS * toCanvas),
    top: 0,
    right: Math.min(canvasWidth, rightCSS * toCanvas),
    bottom: canvasHeight
  };
};

/** The HUD elements that can cover the canvas. */
const HUD_PANEL_SELECTORS = [
  '.mc-left',
  '.int.controls',
  '#bodyInfo',
  '#minimap',
  '.mc-dock',
  '.mc-views',
  '#bodies'
];

/**
 * Measures the HUD panels that cover the canvas (the left column, the Systems
 * panel, the info popup, the minimap, the bottom bar, the views console and
 * the Bodies drawer (#14), when shown), in canvas pixels.
 *
 * Arrows stop outside these, their labels avoid them, and bodies behind them
 * count as off screen.
 *
 * @param {HTMLCanvasElement} canvas - The simulation canvas.
 * @param {number} canvasWidth - The canvas width used for drawing.
 * @returns {ArrowBoundsType[]} The visible panels' rectangles.
 *
 * @example
 * ```ts
 * const obstacles = getHudObstacles(canvas, canvas.width);
 * drawDirectionalArrows({ space, canvasWidth, canvasHeight, obstacles });
 * ```
 */
export const getHudObstacles = (
  canvas: HTMLCanvasElement,
  canvasWidth: number
): ArrowBoundsType[] => {
  const canvasRect = canvas.getBoundingClientRect();

  if (!canvasRect.width) return [];

  // Panels are measured in CSS pixels; the drawing may use device pixels
  const toCanvas = canvasWidth / canvasRect.width;

  return (
    HUD_PANEL_SELECTORS.map((selector) => document.querySelector(selector))
      .filter((element): element is Element => element !== null)
      .map((element) => element.getBoundingClientRect())
      // Hidden panels measure 0 × 0
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: (rect.left - canvasRect.left) * toCanvas,
        top: (rect.top - canvasRect.top) * toCanvas,
        right: (rect.right - canvasRect.left) * toCanvas,
        bottom: (rect.bottom - canvasRect.top) * toCanvas
      }))
  );
};
