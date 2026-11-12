import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseEntries, renderChangelog } from '../changelog.mjs';

const REPO = 'https://github.com/phun-ky/site-interstellar';
/** A `git log` record, as the script asks for it. */
const record = (sha, date, parents, subject, body = '') =>
  `\n${[sha, date, parents, subject, body].join('\x1f')}\x1e`;
const merge = (number, date, title) =>
  record(
    `m${number}`.padEnd(40, '0'),
    date,
    'aaa bbb',
    `Merge pull request #${number} from phun-ky/branch`,
    `${title}\n`
  );

describe('parseEntries', () => {
  test('names a merged pull request by its title, and a direct commit by its subject', () => {
    const entries = parseEntries(
      merge(111, '2026-11-12', 'feat: 🎸 Draw stars') +
        record('c'.repeat(40), '2025-03-24', 'aaa', 'fix: 🐛 Use radians')
    );

    assert.deepEqual(entries, [
      {
        type: 'feat',
        subject: '🎸 Draw stars',
        date: '2026-11-12',
        sha: `m111`.padEnd(40, '0'),
        pr: 111
      },
      {
        type: 'fix',
        subject: '🐛 Use radians',
        date: '2025-03-24',
        sha: 'c'.repeat(40)
      }
    ]);
  });

  test("leaves out what doesn't follow Conventional Commits", () => {
    const entries = parseEntries(
      record('a'.repeat(40), '2025-02-27', '', 'Initial commit') +
        record(
          'b'.repeat(40),
          '2026-11-11',
          'aaa bbb',
          "Merge branch 'main' into x"
        ) +
        merge(7, '2026-11-05', 'Update things')
    );

    assert.deepEqual(entries, []);
  });

  test('files Dependabot updates under dependencies', () => {
    const [entry] = parseEntries(
      merge(64, '2026-11-12', 'chore: 🤖 Bump cssnano from 7.1.9 to 9.9.0')
    );

    assert.equal(entry.type, 'deps');
  });
});

describe('renderChangelog', () => {
  test('lists entries by month, newest first, by type, each linked', () => {
    const changelog = renderChangelog(
      parseEntries(
        merge(111, '2026-11-12', 'feat: 🎸 Draw stars') +
          merge(102, '2026-11-08', 'fix: 🐛 Labels') +
          merge(100, '2026-11-08', 'feat: 🎸 Sounds') +
          record('c'.repeat(40), '2025-03-24', 'aaa', 'fix: 🐛 Use radians')
      ),
      REPO
    );
    const lines = changelog.split('\n').filter((line) => /^(##|-)/.test(line));

    assert.deepEqual(lines, [
      '## November 2026',
      '### Features',
      `- 🎸 Draw stars ([#111](${REPO}/pull/111))`,
      `- 🎸 Sounds ([#100](${REPO}/pull/100))`,
      '### Fixes',
      `- 🐛 Labels ([#102](${REPO}/pull/102))`,
      '## March 2025',
      '### Fixes',
      `- 🐛 Use radians ([ccccccc](${REPO}/commit/${'c'.repeat(40)}))`
    ]);
  });

  test('lists an unknown type under Other', () => {
    const changelog = renderChangelog(
      parseEntries(merge(9, '2026-11-01', 'a11y: Contrast')),
      REPO
    );

    assert.match(changelog, /### Other\n\n- Contrast/);
  });
});
