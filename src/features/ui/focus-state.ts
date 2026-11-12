/** Draws the focus view's HUD over the body, once the view has loaded. */
export type FocusOverlayType = (space: CanvasRenderingContext2D) => void;

/** The focus view's module: its markup, styles and drawing load with it. */
type FocusViewModuleType = typeof import('./focus-view');

let shift = { x: 0, y: 0 };
let overlay: FocusOverlayType | null = null;
let loading: Promise<FocusViewModuleType> | null = null;

/**
 * Whether the focus view is open.
 *
 * @returns {boolean} `true` while a clicked body is shown.
 *
 * @example
 * ```ts
 * if (isFocusView()) return; // zooming is off
 * ```
 */
export const isFocusView = (): boolean =>
  Boolean(globalThis.FOCUSED_CELESTIAL_BODY);

/**
 * How far the focused body is drawn from the middle of the canvas, in CSS
 * pixels: on a narrow screen it sits above the info sheet.
 *
 * @returns {{ x: number; y: number }} The shift, `{0, 0}` with no focus view open.
 *
 * @example
 * ```ts
 * const { x, y } = getFocusShift();
 * ```
 */
export const getFocusShift = (): { x: number; y: number } =>
  isFocusView() ? shift : { x: 0, y: 0 };

/**
 * Sets how far the focused body is drawn from the middle of the canvas.
 *
 * @param {{ x: number; y: number }} next - The shift, in CSS pixels.
 *
 * @example
 * ```ts
 * setFocusShift({ x: 0, y: -120 });
 * ```
 */
export const setFocusShift = (next: { x: number; y: number }): void => {
  shift = next;
};

/**
 * Sets what draws the focus view's HUD, as the view loads.
 *
 * @param {FocusOverlayType} draw - Draws it on the map canvas.
 *
 * @example
 * ```ts
 * setFocusOverlay(drawFocusBody);
 * ```
 */
export const setFocusOverlay = (draw: FocusOverlayType): void => {
  overlay = draw;
};

/**
 * Draws the focus view's HUD over the focused body, when the view is open.
 *
 * @param {CanvasRenderingContext2D} space - The map canvas.
 *
 * @example
 * ```ts
 * drawFocusOverlay(space); // in draw(), before the labels
 * ```
 */
export const drawFocusOverlay = (space: CanvasRenderingContext2D): void => {
  if (isFocusView()) overlay?.(space);
};

/**
 * Loads the focus view, on the first click on a body: its markup, styles
 * and drawing are a file of their own, so the map loads without them.
 *
 * @returns {Promise<FocusViewModuleType>} The view's module.
 *
 * @example
 * ```ts
 * (await loadFocusView()).openFocusView(earth);
 * ```
 */
export const loadFocusView = (): Promise<FocusViewModuleType> => {
  loading ??= import('./focus-view');

  return loading;
};
