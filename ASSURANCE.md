# Assurance Case

Why the [security expectations](SECURITY.md#security-expectations) of
Interstellar hold, what they rest on, and where they don't hold yet. It is kept
short because the site is small: one static page and a 404 page, four runtime
libraries and a font package bundled at build time, and a pipeline that builds
and deploys them to GitHub Pages.

## What is being protected

- **Visitors and their browsers:** the site must draw a map of space and do
  nothing else: run no code but its own, load nothing from other hosts, and
  store or send nothing.
- **The deployed site:** what GitHub Pages serves must be what the Deploy
  workflow built from `main` after the checks passed.
- **The repository and its pipeline:** the source, the workflows, and the token
  that deploys the site.

## Threat model

| Threat                               | Where                                              | How it is countered                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script or markup injected into HTML  | Body names and facts, the Bodies search            | The page reads nothing from the URL, storage or the network. The HTML it builds comes from data bundled with the site, and body names and facts are escaped. The Bodies search is only compared with body names, never rendered. No `eval` or `new Function`         |
| Tracking or loading from other hosts | Scripts, styles, fonts, images, sound, connections | No analytics, cookies, storage or third-party content. The Content Security Policy starts from `default-src 'none'` and allows only the site's own origin; the end-to-end tests check the policy                                                                     |
| A tampered or substituted deploy     | GitHub Pages                                       | Only the Deploy workflow deploys, after the same checks as a pull request pass. The build is repeatable: building a commit twice gives the same files, and a local build of `main` matches the deployed files byte for byte. HTTPS is enforced                       |
| A malicious or vulnerable dependency | Runtime and development dependencies, Actions      | Four runtime libraries from the project's own `@interstellar-tools`, and a font package. Dependency review blocks pull requests that add a high or critical advisory; Dependabot proposes updates weekly, after a 14-day cooldown; Actions are pinned to commit SHAs |
| A malicious change to the source     | Pull requests                                      | Pull requests only, with required checks (lint, types, tests, the build, the end-to-end tests, dependency review, CodeQL, the DCO) on `main`; no force pushes or deletion of `main`                                                                                  |
| Abuse of CI credentials              | Workflows                                          | Read-only default permissions in every workflow, write only for the deploy job; pull requests from forks get no secrets; no workflow runs on `pull_request_target`; secret scanning with push protection                                                             |

## Trust boundaries

1. **Visitor to the page:** pointer, touch and keyboard input move the map, and
   the Bodies search filters a table. None of it is stored, sent anywhere or
   rendered as HTML.
2. **Bundled data to the page:** the bodies, their orbits and facts come from
   the `@interstellar-tools` packages and the repository, fixed at build time.
   Body names and facts are still escaped before they go into HTML.
3. **Repository to GitHub Pages:** only the Deploy workflow can deploy, with a
   short-lived token for that job only, after the checks pass.
4. **GitHub Pages to the visitor:** the site is served over HTTPS, and every
   page carries its Content Security Policy in a `<meta>` tag.

## Secure design principles

- **Economy of mechanism:** a static page, no server, no accounts, and nothing
  stored, not even settings.
- **Fail-safe defaults:** the Content Security Policy starts from
  `default-src 'none'` and allows only what the site needs; the build fails if a
  page has nowhere to put the policy; every sound starts off.
- **Least privilege:** CI tokens are read-only by default; only the deploy job
  can write to GitHub Pages.
- **Complete mediation:** there is no outside input to check; the one free text
  input, the Bodies search, is only ever compared with names.
- **Open design:** everything is public, including the pipeline and this
  document.
- **No dynamic code:** no `eval`, `new Function` or loading of code at run time.
- **Minimal dependencies:** four runtime libraries, all from the same author,
  and a font package, self-hosted.

## Common weaknesses countered

| Weakness                                           | Status                                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| CWE-79 cross-site scripting                        | Body names and facts are escaped for HTML; the Content Security Policy allows no inline or other-origin scripts |
| CWE-94 code injection                              | No dynamic code anywhere in the site                                                                            |
| CWE-829 inclusion from an untrusted control sphere | Nothing is loaded from other hosts; dependencies come only from npm, locked; Actions are pinned to SHAs         |
| CWE-494 download of code without integrity check   | npm verifies the integrity hashes in `package-lock.json`; the site is served only over HTTPS                    |
| CWE-359 exposure of private information            | No analytics, cookies or storage, and no requests to other hosts                                                |

## Known gaps

- **Response headers:** GitHub Pages can't send them, so the page can be framed
  by other sites and blocked requests are not reported; see the
  [security expectations](SECURITY.md#security-expectations). The page has no
  forms, accounts or actions with effects outside it.
- **One maintainer:** pull requests by the maintainer get no second review, and
  access to the repository and the domain rests on one person; see
  [governance](GOVERNANCE.md#continuity).
- **Deploys are not signed:** the site is served over HTTPS from GitHub Pages
  and can be rebuilt byte for byte from its commit, but there is no signed
  provenance for a deploy.
