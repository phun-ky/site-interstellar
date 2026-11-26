# Interstellar

![Interstellar](./public/interstellar-header.png)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg)](http://makeapullrequest.com)
![issues](https://img.shields.io/github/issues/phun-ky/site-interstellar)
![GitHub Repo stars](https://img.shields.io/github/stars/phun-ky/site-interstellar)
[![build](https://github.com/phun-ky/site-interstellar/actions/workflows/deploy.yml/badge.svg)](https://github.com/phun-ky/site-interstellar/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/phun-ky/site-interstellar/graph/badge.svg)](https://codecov.io/gh/phun-ky/site-interstellar)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/16380/badge)](https://www.bestpractices.dev/projects/16380)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/phun-ky/site-interstellar/badge)](https://scorecard.dev/viewer/?uri=github.com/phun-ky/site-interstellar)

## About

> A project journey to simulate our galaxy 1:1

**Live:**
[phun-ky.net/site-interstellar](https://phun-ky.net/site-interstellar/)

Interstellar is a small project I dabble with from time to time between clients.
The goal is to ultimately have a 1:1 simulation of our galaxy and to be able to
view information and follow all known celestial bodies, including calculating
trajectories of asteroids.

Today it is a 2D map of the Milky Way's centre with the S-stars round
Sagittarius A\*, nearby stars, TRAPPIST-1, the solar system with its dwarf
planets and interstellar visitors, and the galaxies around the Milky Way, moving
in real time or faster.

- Pan by dragging with the mouse or a finger, and zoom with the wheel or a
  pinch.
- Lock on any star, planet, moon, comet, asteroid, galaxy or black hole to
  follow it and read its details, or find it in the Bodies table.
- Click or tap a body to look at it up close, with its facts, live range and,
  for many, a real image.
- Keep your bearings with a minimap one level up from the map.
- Switch layers such as moons, comets, labels and orbits on and off, and hold,
  speed up or reset the simulation.
- Turn on sounds in Settings. They are off on every visit.

The orbital mechanics come from
[Interstellar Tools](https://phun-ky.net/interstellar-tools/).

### Timeline

- [x] **First version** is to establish a 2d space for celestial bodies and UI
- [ ] **Second version** is to convert to 3d space
- [ ] **Third version** is to use web workers in some extent
- [ ] **Fourth version** is to draw this with WebGL

See the [roadmap](ROADMAP.md) for what is planned next, and what is not.

## Table of Contents<!-- omit from toc -->

- [About](#about)
  - [Timeline](#timeline)
- [Known issues](#known-issues)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Changelog](#changelog)
- [Sponsor me](#sponsor-me)

![The Interstellar map: the solar system's orbits around the Sun on a starfield, with the telemetry and systems panels](./public/social-card.png)

## Known issues

- Orbits are drawn flat, each turned to its real direction: inclination is
  ignored until the map is 3D (see the [timeline](#timeline)).

## Development

```sh
npm ci
npm run dev # http://localhost:3000/site-interstellar/
npm test
npm run build
npm run test:e2e
```

The [contributing guide](CONTRIBUTING.md#your-first-code-contribution) has the
requirements, the architecture, every script and the tests.

## Contributing

Want to contribute? Please read the
[CONTRIBUTING.md](https://github.com/phun-ky/site-interstellar/blob/main/CONTRIBUTING.md)
and
[CODE_OF_CONDUCT.md](https://github.com/phun-ky/site-interstellar/blob/main/CODE_OF_CONDUCT.md)

## License

This project is licensed under a
[GPL-3.0 License](https://choosealicense.com/licenses/gpl-3.0/). - see the
[LICENSE](https://github.com/phun-ky/site-interstellar/blob/main/LICENSE) file
for details.

The surface maps in `src/assets/textures/`, downscaled to 2048×1024:

| Body      | Source                                                                                                                                                   | Credit and licence                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Mercury   | USGS [MESSENGER MDIS global color mosaic](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_color_mosaic_665m), made grayscale      | MESSENGER Team, NASA/JHUAPL/CIW; USGS Astrogeology; public domain             |
| Venus     | USGS [Magellan C3-MDIR synthetic color mosaic](https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_synthetic_color_mosaic_4641m)      | NASA/JPL Magellan; USGS Astrogeology; public domain. The colour is simulated  |
| Earth     | [Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/), July 2004, with topography and bathymetry | NASA Earth Observatory                                                        |
| Moon      | NASA SVS [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720), from Lunar Reconnaissance Orbiter data                                                          | NASA's Scientific Visualization Studio                                        |
| Mars      | [Solar System Scope](https://www.solarsystemscope.com/textures/)                                                                                         | Solar System Scope, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Ceres     | USGS [Dawn FC global mosaic](https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_global_mosaic_400m)                                                  | NASA/JPL-Caltech/UCLA/MPS/DLR/IDA                                             |
| Io        | USGS [Galileo SSI/Voyager color merged mosaic](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km)           | NASA/JPL; USGS Astrogeology; public domain                                    |
| Europa    | USGS [Voyager/Galileo SSI global mosaic](https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m)                         | NASA/JPL; USGS Astrogeology                                                   |
| Ganymede  | USGS [Voyager/Galileo SSI global mosaic](https://astrogeology.usgs.gov/search/map/ganymede_voyager_galileo_ssi_global_mosaic_1km)                        | NASA/JPL; USGS Astrogeology; public domain                                    |
| Callisto  | USGS [Galileo/Voyager global mosaic](https://astrogeology.usgs.gov/search/map/callisto_galileo_voyager_global_mosaic_1km)                                | NASA/JPL; USGS Astrogeology; public domain                                    |
| Mimas     | [PIA17214](https://science.nasa.gov/photojournal/mimas-global-map-june-2017/)                                                                            | NASA/JPL-Caltech/Space Science Institute                                      |
| Enceladus | USGS [Cassini global mosaic](https://astrogeology.usgs.gov/search/map/enceladus_cassini_global_mosaic_110m)                                              | NASA/JPL/Space Science Institute; USGS Astrogeology; public domain            |
| Tethys    | USGS [Cassini global mosaic](https://astrogeology.usgs.gov/search/map/tethys_cassini_global_mosaic_293m)                                                 | T. Roatsch et al.; NASA/JPL/Space Science Institute; public domain            |
| Dione     | USGS [Cassini/Voyager global mosaic](https://astrogeology.usgs.gov/search/map/dione_cassini_voyager_global_mosaic_154m)                                  | NASA/JPL/Space Science Institute; USGS Astrogeology; public domain            |
| Rhea      | USGS [Cassini/Voyager global mosaic](https://astrogeology.usgs.gov/search/map/rhea_cassini_voyager_global_mosaic_417m)                                   | T. Roatsch et al.; NASA/JPL/Space Science Institute; public domain            |
| Iapetus   | USGS [Cassini/Voyager global mosaic](https://astrogeology.usgs.gov/search/map/iapetus_cassini_voyager_global_mosaic_803m)                                | NASA/JPL/Space Science Institute; USGS Astrogeology; public domain            |
| Titan     | USGS [Cassini ISS global mosaic](https://astrogeology.usgs.gov/search/map/titan_cassini_iss_global_mosaic_4005m), 938 nm (PIA19658)                      | Cassini ISS Team, NASA/JPL-Caltech/SSI                                        |

Gaps in the Europa, Ganymede, Callisto and Ceres mosaics are filled with the
mean of their latitude, and the Ganymede and Callisto mosaics are brightened.

## Changelog

See the
[CHANGELOG.md](https://github.com/phun-ky/site-interstellar/blob/main/CHANGELOG.md)
for details on the latest updates.

## Sponsor me

I'm an Open Source evangelist, creating stuff that does not exist yet to help
get rid of secondary activities and to enhance systems already in place, be it
documentation or web sites.

The sponsorship is an unique opportunity to alleviate more hours for me to
maintain my projects, create new ones and contribute to the large community
we're all part of :)

[Support me on GitHub Sponsors](https://github.com/sponsors/phun-ky).
