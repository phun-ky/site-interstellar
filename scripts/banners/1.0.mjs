// Content of the release banners for 1.0. Copy this file for the next major
// (e.g. 2.0.mjs) and run: npm run banners -- 2.0
export default {
  slug: 'v1',
  pill: 'Release 1.0 · March 2025',
  kicker: '// First version',
  title: ['A 2D space for', { accent: 'celestial bodies' }],
  body: 'The first version puts the solar system on a map in your browser: the planets and their moons, comets and the asteroid belts, with the Milky Way, Andromeda and Triangulum further out, moving in real time or faster.',
  // The nav chart, as on the README header: the planets' orbits from the
  // Sun's glow, by their ids in @interstellar-tools/constants, with the
  // locked one in amber
  chart: {
    label: 'Nav chart · Solar system',
    status: 'Real time',
    planets: [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune'
    ],
    lock: 'earth'
  }
};
