import {
  ASTEROIDS,
  COMETS,
  MOONS,
  PLANETS,
  STARS
} from '@interstellar-tools/constants';
import { CelestialBodyType } from '@interstellar-tools/types';

import { Button } from '../../components/actions/Button';
import { ToggleBox } from '../../components/ToggleBox';
import { OPTIONS_UI } from '../canvas/config/hud';

export const setupUI = () => {
  const toggleTrajectoriesBox = ToggleBox({
    id: 'toggleTrajectory',
    checked: true,
    name: 'toggleTrajectory',
    label: 'Trajectories'
  });
  const toggleMoonsBox = ToggleBox({
    id: 'toggleMoons',
    checked: false,
    name: 'toggleMoons',
    label: 'Moons'
  });
  const toggleCometsBox = ToggleBox({
    id: 'toggleComets',
    checked: false,
    name: 'toggleComets',
    label: 'Comets'
  });
  const toggleLabelsBox = ToggleBox({
    id: 'toggleLabels',
    checked: true,
    name: 'toggleLabels',
    label: 'Labels'
  });
  const toggleArrowheadsBox = ToggleBox({
    id: 'toggleArrowheads',
    checked: true,
    name: 'toggleArrowheads',
    label: 'Arrows'
  });
  const toggleAsteroidBeltsBox = ToggleBox({
    id: 'toggleAsteroidBelts',
    checked: false,
    name: 'toggleAsteroidBelts',
    label: 'Asteroid belts'
  });
  const toggleAsteroidsBox = ToggleBox({
    id: 'toggleAsteroids',
    checked: false,
    name: 'toggleAsteroids',
    label: 'Asteroids'
  });
  const toggleStarfieldBox = ToggleBox({
    id: 'toggleStarfield',
    checked: false,
    name: 'toggleStarfield',
    label: 'Starfield'
  });
  const pauseButton = Button({
    children: 'Hold',
    id: 'pause',
    type: 'button',
    className: 'mc-button'
  });
  const resetButton = Button({
    children: 'Reset to now',
    id: 'resetToNow',
    type: 'button',
    className: 'mc-button mc-button-secondary'
  });
  const arrowCountOptions = [5, 10, 20]
    .map(
      (count) =>
        `<option value="${count}"${count === OPTIONS_UI.arrowHeadsCount ? ' selected' : ''}>Nearest ${count}</option>`
    )
    .join('');
  const optionsElement = document.getElementById('options');

  if (optionsElement) {
    optionsElement.innerHTML = `
    ${toggleMoonsBox}
    ${toggleAsteroidBeltsBox}
    ${toggleAsteroidsBox}
    ${toggleCometsBox}
    ${toggleStarfieldBox}
    ${toggleArrowheadsBox}
    ${toggleLabelsBox}
    ${toggleTrajectoriesBox}
    <hr class="int" />
    <label class="int mc-field" for="arrowCount">
      Arrows
      <select id="arrowCount" class="int">${arrowCountOptions}</select>
    </label>
    <label class="int mc-field" for="toggleTrajectoryType">
      Trajectory
      <select id="toggleTrajectoryType" class="int">
        <option value="orbits">Full orbits</option>
        <option value="trails">Trails</option>
      </select>
    </label>
    <label class="int mc-field" for="speedMode">
      Speed
      <select id="speedMode" class="int">
        <option value="realTime">Real time</option>
        <option value="quarterFramePerDay">¼ day / frame</option>
        <option value="framePerDay">1 day / frame</option>
        <option value="spedUp">10 days / frame</option>
        <option value="insane">1 000 days / frame</option>
      </select>
    </label>
    <div class="int mc-field">
      <label class="int" for="lockOn">Lock</label>
      <span class="int mc-lock">
        <select id="lockOn" class="int">
          <option value="noLock">No lock</option>
        </select>
        <button
          type="button"
          class="int mc-lock-info"
          id="bodyInfoOpen"
          aria-controls="bodyInfo"
          aria-expanded="false"
          disabled
        >
          Info
        </button>
      </span>
    </div>
    ${pauseButton}
    ${resetButton}
    `;
  }

  const lockOnDropdown = document.getElementById('lockOn') as HTMLSelectElement;
  const lockGroups: [label: string, bodies: CelestialBodyType[]][] = [
    ['Stars', STARS],
    ['Planets', PLANETS],
    ['Moons', MOONS],
    ['Comets', COMETS],
    ['Asteroids', ASTEROIDS]
  ];

  // Every body, by id, so any body that can be clicked can also be picked here
  lockGroups.forEach(([label, bodies]) => {
    const group = document.createElement('optgroup');

    group.label = label;
    bodies.forEach(({ id, name }) => {
      const option = document.createElement('option');

      option.value = id;
      option.textContent = name;
      group.appendChild(option);
    });
    lockOnDropdown.appendChild(group);
  });
};
