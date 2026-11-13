import { StarfieldStarInterface } from '../generate-star-field';

/**
 * Represents a global store for dynamically generated stars in the starfield.
 *
 * **Starfield Data Structure:**
 * - `value` contains an array of `StarfieldStarInterface` objects.
 * - The array holds dynamically generated stars for rendering.
 * - The object is **mutable**, allowing updates to the starfield in real-time.
 *
 * @example
 * ```ts
 * import { starfield } from './starfield';
 *
 * starfield.value = createStarfield(800, 600);
 * console.log(starfield.value.length); // Outputs the number of stars
 * ```
 */
export const starfield: { value: StarfieldStarInterface[] } = { value: [] };
