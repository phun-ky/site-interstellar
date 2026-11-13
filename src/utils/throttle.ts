/**
 * Creates a **throttled function** that ensures the callback executes **at most once per animation frame**.
 *
 * **Functionality:**
 * - Prevents excessive function calls by ensuring execution **only once per frame**.
 * - Uses `requestAnimationFrame` to sync execution with **browser rendering cycles**.
 *
 * @param {() => void} callback - The function to throttle.
 * @returns {() => void} - The throttled function.
 *
 * @example
 * ```ts
 * const throttledFn = throttle(() => console.log('Throttled execution'));
 * globalThis.addEventListener('scroll', throttledFn);
 * ```
 */
export const throttle = (callback: () => void): (() => void) => {
  let running = false;

  return () => {
    if (running) {
      return;
    }

    running = true;
    requestAnimationFrame(() => {
      callback();
      running = false;
    });
  };
};
