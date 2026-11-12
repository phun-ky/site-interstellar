# Changelog

What has changed, month by month, newest first: the pull requests merged
into main, and before them the commits made straight to it. Each merge
is deployed to the site. Rebuilt with `npm run changelog`.

## November 2026

### Features

- 🎸 Draw overlapping stars as one, and star systems by name ([#111](https://github.com/phun-ky/site-interstellar/pull/111))
- 🎸 Draw bodies at sizes that tell them apart at every zoom ([#110](https://github.com/phun-ky/site-interstellar/pull/110))
- 🎸 The header menu in a row, with the hamburger only where it can't fit ([#108](https://github.com/phun-ky/site-interstellar/pull/108))
- 🎸 The 2.7 data: oriented orbits, interstellar objects and galaxies ([#106](https://github.com/phun-ky/site-interstellar/pull/106))
- 🎸 The latest @interstellar-tools data, with every body that can be drawn ([#104](https://github.com/phun-ky/site-interstellar/pull/104))
- 🎸 Optional sounds, set in a Settings dialog from a header menu ([#100](https://github.com/phun-ky/site-interstellar/pull/100))
- 🎸 Pan with a finger and pinch to zoom ([#89](https://github.com/phun-ky/site-interstellar/pull/89))
- 🎸 Keep the map clear on narrow screens and phones ([#88](https://github.com/phun-ky/site-interstellar/pull/88))
- 🎸 Header links to Interstellar Tools, the repository, sponsoring and contributing ([#87](https://github.com/phun-ky/site-interstellar/pull/87))
- 🎸 Complete the page metadata ([#84](https://github.com/phun-ky/site-interstellar/pull/84))
- 🎸 Check links and HTML, and add a 404 page ([#77](https://github.com/phun-ky/site-interstellar/pull/77))
- 🎸 Check accessibility with axe, and add a skip link and landmarks ([#76](https://github.com/phun-ky/site-interstellar/pull/76))
- 🎸 Bundle the headings font and add a Content Security Policy ([#71](https://github.com/phun-ky/site-interstellar/pull/71))
- 🎸 Mission HUD, Vite and @interstellar-tools packages ([#21](https://github.com/phun-ky/site-interstellar/pull/21))

### Fixes

- 🐛 No two body labels overlap: the larger body's label counts the rest ([#102](https://github.com/phun-ky/site-interstellar/pull/102))
- 🐛 Open the body info from the keyboard, with Info by the Lock menu ([#101](https://github.com/phun-ky/site-interstellar/pull/101))
- 🐛 Stop arrow labels jumping when they get close ([#96](https://github.com/phun-ky/site-interstellar/pull/96))
- 🐛 Show a locked planet's moons when Moons is turned on ([#86](https://github.com/phun-ky/site-interstellar/pull/86))
- 🐛 Asteroids without the belts, no grid under the starfield ([#81](https://github.com/phun-ky/site-interstellar/pull/81))
- 🐛 Cover the arrow panel cases and drop a dead guard ([#66](https://github.com/phun-ky/site-interstellar/pull/66))
- 🐛 Keep arrows above the info popup ([#51](https://github.com/phun-ky/site-interstellar/pull/51))
- 🐛 Track bodies in view and trails by id ([#49](https://github.com/phun-ky/site-interstellar/pull/49))
- 🐛 Place bodies by their true anomaly ([#48](https://github.com/phun-ky/site-interstellar/pull/48))
- 🐛 Centre the scene on the CSS size on high-DPI screens ([#46](https://github.com/phun-ky/site-interstellar/pull/46))
- 🐛 Point Open Graph metadata at the deployed site ([#45](https://github.com/phun-ky/site-interstellar/pull/45))
- 🐛 Stop releases from publishing to npm ([#44](https://github.com/phun-ky/site-interstellar/pull/44))

### Documentation

- ✏️ Add GOVERNANCE.md and ROADMAP.md ([#94](https://github.com/phun-ky/site-interstellar/pull/94))
- ✏️ Document setting up, scripts, tests, commits and deploys ([#93](https://github.com/phun-ky/site-interstellar/pull/93))
- ✏️ Refresh the README ([#92](https://github.com/phun-ky/site-interstellar/pull/92))
- ✏️ Add a build badge to the README ([#72](https://github.com/phun-ky/site-interstellar/pull/72))
- ✏️ Describe the rulesets now in force on main ([#67](https://github.com/phun-ky/site-interstellar/pull/67))
- ✏️ Rewrite the security policy and add Security Insights ([#60](https://github.com/phun-ky/site-interstellar/pull/60))

### Tests

- 💍 Performance budgets on a throttled phone ([#83](https://github.com/phun-ky/site-interstellar/pull/83))
- 💍 Add end-to-end tests for the app in Chromium and Firefox ([#73](https://github.com/phun-ky/site-interstellar/pull/73))

### CI

- 🎡 Answer the OpenSSF Best Practices criteria and check them in CI ([#95](https://github.com/phun-ky/site-interstellar/pull/95))
- 🎡 Run the end-to-end tests in the runner's Chrome, with nothing to download ([#78](https://github.com/phun-ky/site-interstellar/pull/78))
- 🎡 Deploy the site to GitHub Pages on every push to main ([#68](https://github.com/phun-ky/site-interstellar/pull/68))
- 🎡 Add dependency review and OpenSSF Scorecard workflows ([#58](https://github.com/phun-ky/site-interstellar/pull/58))
- 🎡 Add a check workflow with one aggregate check ([#54](https://github.com/phun-ky/site-interstellar/pull/54))

### Chores

- 🤖 Remove the assets nothing uses, test for them, and upload coverage ([#97](https://github.com/phun-ky/site-interstellar/pull/97))
- 🤖 No robots.txt or sitemap.xml until the site has its own domain ([#85](https://github.com/phun-ky/site-interstellar/pull/85))
- 🤖 Point the site and every link at site-interstellar ([#70](https://github.com/phun-ky/site-interstellar/pull/70))
- 🤖 Add issue forms for bugs and feature requests ([#61](https://github.com/phun-ky/site-interstellar/pull/61))
- 🤖 Add rulesets for main and a DCO sign-off hook ([#59](https://github.com/phun-ky/site-interstellar/pull/59))
- 🤖 Refresh the lockfile and drop the unused stylus ([#57](https://github.com/phun-ky/site-interstellar/pull/57))
- 🤖 Remove putout and other unused files ([#56](https://github.com/phun-ky/site-interstellar/pull/56))
- 🤖 Add a Dependabot config with grouping and a cooldown ([#55](https://github.com/phun-ky/site-interstellar/pull/55))
- 🤖 Run tests with Node's own globs and enforce a coverage floor ([#53](https://github.com/phun-ky/site-interstellar/pull/53))
- 🤖 Lint the whole repository with eslint-config-phun-ky 2 ([#52](https://github.com/phun-ky/site-interstellar/pull/52))

## June 2026

### Chores

- backup ([fdd2307](https://github.com/phun-ky/site-interstellar/commit/fdd23071dbf1441217ff4674fd75270406040965))

## March 2025

### Features

- 🎸 Add support for asteroids ([374b55d](https://github.com/phun-ky/site-interstellar/commit/374b55d2ca455febdc858b2b2abf5393cd6b484f))
- 🎸 Add new speed mode, quarter day per frame ([ce2f1fc](https://github.com/phun-ky/site-interstellar/commit/ce2f1fcc89201aa3a2842b7a87b69e0168c9d050))

### Fixes

- 🐛 Use radians instead of degrees ([2ff4fa8](https://github.com/phun-ky/site-interstellar/commit/2ff4fa82042a1e983c10bebab5649ccc37e823ed))
- 🐛 Convert degrees to radians ([f9d63d8](https://github.com/phun-ky/site-interstellar/commit/f9d63d812bc50ce91c6c0b6abd67da49cfcb64d0))
- 🐛 Move `Ceres` to planets, it is a planet ([e344c01](https://github.com/phun-ky/site-interstellar/commit/e344c0128bebfe6db27d1aa9d8a7773ef5eacd33))
- 🐛 Use correct types for `drawDirectionalArrows` ([be0f508](https://github.com/phun-ky/site-interstellar/commit/be0f508869a2bf99421aaab2f15a06164b360050))
- 🐛 Refactor zoom event ([bbdc565](https://github.com/phun-ky/site-interstellar/commit/bbdc565217dd640d306505b8e50f9490058552ad))
- 🐛 Make sure the bodies orbits in the correct direction ([e32da12](https://github.com/phun-ky/site-interstellar/commit/e32da12a10ffbba47ead03d3ad761b0d22bdfb76))
- 🐛 Add missing `RangeError` ([e14f0c2](https://github.com/phun-ky/site-interstellar/commit/e14f0c22a61b70dc995542b232560e672be99480))
- 🐛 Round `maxDeltaT` ([b8a9468](https://github.com/phun-ky/site-interstellar/commit/b8a94681b378398462e354a42e1543a190afb2ee))
- 🐛 Fix typo in error message ([ae56379](https://github.com/phun-ky/site-interstellar/commit/ae56379e8a4e5a41e18389c15ed76b38dff98609))
- 🐛 Disabled mdx plugin to get rid off unwanted indentation ([b650d19](https://github.com/phun-ky/site-interstellar/commit/b650d19f5e9f4d3e93979cd57586f4935253e67d))

### Documentation

- ✏️ Adding diagrams ([42e8d3a](https://github.com/phun-ky/site-interstellar/commit/42e8d3afd16d5999828192b571387ecc4a444e21))
- ✏️ Update documentation for math calculations ([d278097](https://github.com/phun-ky/site-interstellar/commit/d278097fc2512efd17f3ef603b73b041c9148380))
- ✏️ Fix typo in documentation ([70b9288](https://github.com/phun-ky/site-interstellar/commit/70b9288dd0bd5453aafebc63efb1d150a531b1e5))
- ✏️ Update documentation ([46677f4](https://github.com/phun-ky/site-interstellar/commit/46677f46351be4f80190d62c530e0538fa03a738))
- ✏️ Initial `CHANGELOG.md` ([39a93cc](https://github.com/phun-ky/site-interstellar/commit/39a93cc603badb92ff5c5f677ecf7f674c8e821a))
- ✏️ regenerated docs ([87e9548](https://github.com/phun-ky/site-interstellar/commit/87e95482975da208772b6874d941308ddae2cf76))

### Tests

- 💍 Trying still to get the comets to work correctly ([bacbca4](https://github.com/phun-ky/site-interstellar/commit/bacbca4d5cc2adb6fd87c5941be0bcabaefcf4e2))
- 💍 Add tests for `generateTimestep` ([1dd35ca](https://github.com/phun-ky/site-interstellar/commit/1dd35ca0398af0b1b73923369725d7b88259ebeb))
- 💍 Add more test for the math calculations ([940b9c8](https://github.com/phun-ky/site-interstellar/commit/940b9c8c80bd0115431d562ac6ded517b6eefda6))

### Refactoring

- 💡 Rename `Radian` to `Radians` ([459e3a9](https://github.com/phun-ky/site-interstellar/commit/459e3a91e1923ed67493b3aec70ddcf6550dc5e1))
- 💡 Update references to moved types ([f38ff9d](https://github.com/phun-ky/site-interstellar/commit/f38ff9d42fab7f79ff4bb03d8d58d2adc9f5461a))
- 💡 Move types into designated folder for celestial bodies ([cf7ae41](https://github.com/phun-ky/site-interstellar/commit/cf7ae41a1408b1dd55f0000e55ce3a4a45b7d67f))
- 💡 Use different initial values ([ad127ad](https://github.com/phun-ky/site-interstellar/commit/ad127ade75109c66f51114990214548924752053))
- 💡 Only compute when body is rendered ([a38b72a](https://github.com/phun-ky/site-interstellar/commit/a38b72aba98ad094b1e576add3e2601253ba55fc))
- 💡 Remove comment ([edbd19e](https://github.com/phun-ky/site-interstellar/commit/edbd19e8c7d0cb5e905577bd20bff72c50f559d5))
- 💡 Allow for moon threshold to be higher ([deaaa2c](https://github.com/phun-ky/site-interstellar/commit/deaaa2ca8610d6297aff7f8a8c02e8a014f838ca))
- 💡 Add a constant for `2 * Math.PI` ([7862500](https://github.com/phun-ky/site-interstellar/commit/78625000859fcc45aac976607ccc6595e2657753))
- 💡 Add missing type ([c6fd643](https://github.com/phun-ky/site-interstellar/commit/c6fd6433638a6f6dc866d9b85e7963c495abfa1b))
- 💡 Remove old import ([4e3f8ce](https://github.com/phun-ky/site-interstellar/commit/4e3f8cec9b88d06427b241b7d25d5b6ea6eddea1))
- 💡 Split out types for systems ([e340830](https://github.com/phun-ky/site-interstellar/commit/e34083033da4496f3b7ff119aa195b3279509083))
- 💡 Improve handling of timeStep generation for all types of screen refresh rates ([43a913b](https://github.com/phun-ky/site-interstellar/commit/43a913b78c8bfbf47923829da4922897fd7f4924))
- 💡 Use a constant for `SPEED_MODE` instead of element ([9021963](https://github.com/phun-ky/site-interstellar/commit/9021963ce0fa4ba77ffd7fe0ed0c05a34bb258ed))

### Chores

- 🤖 Add dataset for images ([bff686d](https://github.com/phun-ky/site-interstellar/commit/bff686d6cb3076ec3c23ebdd66b918b892142da8))
- 🤖 testing something ([b607daf](https://github.com/phun-ky/site-interstellar/commit/b607daf8e014128a6dceb3cf8d522676f06bc233))
- 🤖 Add meta stuff to the site ([eb1ba46](https://github.com/phun-ky/site-interstellar/commit/eb1ba4655d4269e83a095cffcd67e38f15427d29))
- 🤖 release v1.0.0 ([296d2ad](https://github.com/phun-ky/site-interstellar/commit/296d2adeef5a43d20ea52d82842fb15f373ddee0))
- 🤖 Update docs ([36a1547](https://github.com/phun-ky/site-interstellar/commit/36a1547f2a96dae0194d1fe5b3defb965ae0a579))
- 🤖 last fixes before initial push ([aec2804](https://github.com/phun-ky/site-interstellar/commit/aec2804335a2c29e698c09336c2e06b4ea48d17e))
- 🤖 Initial version ([149088c](https://github.com/phun-ky/site-interstellar/commit/149088cf3d605eb3c1f0d659c099f778543d4e1d))
