# Roadmap

What Interstellar intends to do, and not do. It's a plan, not a promise:
priorities can change, and changes to this file are made in pull requests like
any other. Individual pieces of work are tracked as
[GitHub issues](https://github.com/phun-ky/site-interstellar/issues), grouped in
[milestones](https://github.com/phun-ky/site-interstellar/milestones).

## Done in November 2026

The repository and the site were overhauled:

- **Fixes:** bodies placed on the right point of their orbits, the scene centred
  on high-DPI screens, bodies with the same name kept apart, the "In view" list
  kept to what is drawn, and the arrows kept clear of the info popup.
- **Hardening:** CI with one aggregate check, a coverage floor, pinned and
  reviewed dependencies, Dependabot, OpenSSF Scorecard and a
  [security policy](SECURITY.md); branch rules with required checks and DCO
  sign-off ([#30](https://github.com/phun-ky/site-interstellar/issues/30)),
  unused files and secrets removed
  ([#33](https://github.com/phun-ky/site-interstellar/issues/33)), and the
  OpenSSF Best Practices passing badge
  ([#43](https://github.com/phun-ky/site-interstellar/issues/43)).
- **Website quality:**
  - deploys from CI after the checks pass
  - a Content Security Policy that loads nothing from other hosts, with the
    fonts self-hosted
  - accessibility checks with axe and by keyboard
  - end-to-end tests, link and HTML checks, and a 404 page
  - performance budgets on a throttled phone
  - page metadata and a social card
  - a header linking to Interstellar Tools
  - a layout and touch gestures for phones
  - Solar system, Galaxy and Bodies views at the bottom of the map
    ([#14](https://github.com/phun-ky/site-interstellar/issues/14)), with every
    body in a table to search, sort and lock on, and the map opening on the
    Solar system
- **The map:**
  - a focus view: click a body to look at it up close, with time held
  - the body info opened with the keyboard
    ([#90](https://github.com/phun-ky/site-interstellar/issues/90))
  - labels that don't overlap at solar system scale
    ([#91](https://github.com/phun-ky/site-interstellar/issues/91))
  - stars in nested systems told apart at galaxy scale
    ([#13](https://github.com/phun-ky/site-interstellar/issues/13))
  - panning while a body is locked, with Centre to bring it back
    ([#118](https://github.com/phun-ky/site-interstellar/issues/118))
  - a minimap one level up from the map: the system around the locked body, the
    Milky Way with a marker, or the Milky Way among its neighbours
    ([#117](https://github.com/phun-ky/site-interstellar/issues/117))
  - what is measured about the bodies, from the latest Interstellar Tools data:
    stars' class, mass, temperature, luminosity, gravity and metallicity, and
    every body's rotation, rings and discovery

## Planned

- **A Step button**
  ([#15](https://github.com/phun-ky/site-interstellar/issues/15)) to advance one
  frame while the simulation is held.

## Later

The larger steps toward a 1:1 simulation of the galaxy, from the
[timeline](README.md#timeline). Each would start with a discussion in an issue.

- **3D space,** with orbits drawn at their real inclination.
- **Web workers** for the orbital calculations.
- **Drawing with WebGL.**
- **A domain of its own,** instead of a path on `phun-ky.net`.

## Not planned

- **Accounts or a backend.** The site stays static on GitHub Pages: no sign-in,
  no server and no stored user data.
- **Third-party services,** such as analytics, ads, trackers, CDNs or embeds.
  Everything the site needs is served by the site itself, as its
  [Content Security Policy](SECURITY.md) requires.
