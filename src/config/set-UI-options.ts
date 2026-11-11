import { OPTIONS_UI } from '../features/canvas/config/hud';

/**
 * Represents the properties for setting UI options in the simulation.
 */
export type SetUIOptionsPropsType = {
  /** Checkbox element for toggling trajectory visibility. */
  trajectoryCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling labels visibility. */
  labelCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling moons visibility. */
  moonsCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling arrowheads visibility. */
  toggleArrowheadsElement: HTMLInputElement;
  /** Checkbox element for toggling comets visibility. */
  cometsCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling the interstellar objects' visibility. */
  interstellarCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling asteroid belts visibility. */
  asteroidBeltsCheckboxElement: HTMLInputElement;
  /** Checkbox element for toggling asteroids visibility. */
  asteroidsCheckboxElement: HTMLInputElement;
  starfieldCheckboxElement: HTMLInputElement;
};

/**
 * Updates the UI options based on the provided checkbox elements.
 *
 * This function synchronizes the user interface checkboxes with the OPTIONS_UI settings,
 * ensuring the visualization updates accordingly.
 *
 * @param {SetUIOptionsProps} props - The properties containing the checkbox elements.
 *
 * @example
 * ```ts
 * setUIOptions({
 *   trajectoryCheckboxElement: document.getElementById('trajectory') as HTMLInputElement,
 *   labelCheckboxElement: document.getElementById('labels') as HTMLInputElement,
 *   moonsCheckboxElement: document.getElementById('moons') as HTMLInputElement,
 *   toggleArrowheadsElement: document.getElementById('arrowheads') as HTMLInputElement,
 *   cometsCheckboxElement: document.getElementById('comets') as HTMLInputElement,
 *   asteroidBeltsCheckboxElement: document.getElementById('asteroid-belts') as HTMLInputElement
 *   asteroidsCheckboxElement: document.getElementById('asteroids') as HTMLInputElement
 *   starfieldCheckboxElement: document.getElementById('starfield') as HTMLInputElement
 * });
 * ```
 */
export const setUIOptions = (props: SetUIOptionsPropsType) => {
  const {
    trajectoryCheckboxElement,
    labelCheckboxElement,
    moonsCheckboxElement,
    toggleArrowheadsElement,
    cometsCheckboxElement,
    interstellarCheckboxElement,
    asteroidBeltsCheckboxElement,
    asteroidsCheckboxElement,
    starfieldCheckboxElement
  } = props;

  OPTIONS_UI.trajectory = trajectoryCheckboxElement.checked || false;
  OPTIONS_UI.labels = labelCheckboxElement.checked || false;
  OPTIONS_UI.moons = moonsCheckboxElement.checked || false;
  OPTIONS_UI.arrowHeads = toggleArrowheadsElement.checked || false;
  OPTIONS_UI.comets = cometsCheckboxElement.checked || false;
  OPTIONS_UI.interstellar = interstellarCheckboxElement.checked || false;
  OPTIONS_UI.asteroidBelts = asteroidBeltsCheckboxElement.checked || false;
  OPTIONS_UI.asteroids = asteroidsCheckboxElement.checked || false;
  OPTIONS_UI.starfield = starfieldCheckboxElement.checked || false;
};
