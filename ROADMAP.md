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
  [security policy](SECURITY.md).
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
    body in a table to search, sort and lock on
  - a focus view: click a body to look at it up close, with time held

## Planned

- **The body info with the keyboard**
  ([#90](https://github.com/phun-ky/site-interstellar/issues/90)): open a body's
  details without a pointer.
- **Labels that don't overlap**
  ([#91](https://github.com/phun-ky/site-interstellar/issues/91)) at solar
  system scale.
- **Stars in nested systems told apart at galaxy scale**
  ([#13](https://github.com/phun-ky/site-interstellar/issues/13)).
- **A Step button**
  ([#15](https://github.com/phun-ky/site-interstellar/issues/15)) to advance one
  frame while the simulation is held.
- **Finishing the hardening:** branch rules with required checks and DCO
  sign-off ([#30](https://github.com/phun-ky/site-interstellar/issues/30)), and
  removing unused files and secrets
  ([#33](https://github.com/phun-ky/site-interstellar/issues/33)).
- **OpenSSF Best Practices**
  ([#43](https://github.com/phun-ky/site-interstellar/issues/43)): the passing
  badge, with the answers kept in the repository.

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
