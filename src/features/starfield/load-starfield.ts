type StarfieldModuleType = typeof import('./index');

let starfieldModule: StarfieldModuleType | null = null;
let loading: Promise<StarfieldModuleType> | null = null;

/**
 * The starfield's module, once loaded: the first call starts loading it, as
 * a file of its own, and returns `null` until it has. Starfield is off by
 * default, so the map's page loads without it.
 *
 * @returns {StarfieldModuleType | null} The module, or `null` while it loads.
 *
 * @example
 * ```ts
 * const starfield = getStarfield();
 *
 * if (starfield) starfield.drawStarfield(space, width, height);
 * ```
 */
export const getStarfield = (): StarfieldModuleType | null => {
  loading ??= import('./index').then((loaded) => (starfieldModule = loaded));

  return starfieldModule;
};
