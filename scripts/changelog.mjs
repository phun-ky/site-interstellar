// Rebuilds CHANGELOG.md from what has landed on main, month by month, newest
// first: a line per pull request merged into main, named by its title, and a
// line per commit made straight to main (as in early 2025). Run it by hand
// with `npm run changelog`, after `git fetch`, and commit the result in a pull
// request. Only main's own line of history is read (`--first-parent`), so the
// commits inside a pull request and merges into branches are left out.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Sections, in the order they are listed, by Conventional Commits type. */
export const SECTIONS = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['docs', 'Documentation'],
  ['test', 'Tests'],
  ['refactor', 'Refactoring'],
  ['style', 'Style'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['chore', 'Chores'],
  ['deps', 'Dependencies'],
  ['revert', 'Reverts']
];

const TITLE = /^(?<type>[a-z][a-z0-9]*)(?:\([^)]*\))?!?: (?<subject>.+)$/;
const MERGE = /^Merge pull request #(?<number>\d+) /;
/** A Dependabot update, such as `🤖 Bump vite from 8.3.5 to 8.3.6`. */
const BUMP = /(^|\s)Bump /;
const FIELD = '\x1f';
const RECORD = '\x1e';
const MONTH = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

/**
 * Reads the changelog entries from `git log` output, one record per commit
 * (`%H`, `%cs`, `%P`, `%s`, `%b`, split by `FIELD`, ended by `RECORD`).
 * A merged pull request is named by its title, the first line of the merge
 * commit's body; a commit straight to main, by its subject. What doesn't
 * follow Conventional Commits, such as `Initial commit` or `Merge branch`, is
 * left out.
 *
 * @param {string} log - The `git log` output.
 * @returns {{ type: string, subject: string, date: string, pr?: number, sha: string }[]} The entries, newest first.
 */
export const parseEntries = (log) =>
  log
    .split(RECORD)
    .map((record) => record.replace(/^\n/, ''))
    .filter(Boolean)
    .flatMap((record) => {
      const [sha, date, parents, subject, body = ''] = record.split(FIELD);
      const merge = parents.trim().includes(' ') ? subject.match(MERGE) : null;
      const title = merge
        ? (body
            .split('\n')
            .map((line) => line.trim())
            .find(Boolean) ?? '')
        : subject;
      const parsed = title.match(TITLE);

      if (!parsed) return [];

      const { type, subject: text } = parsed.groups;

      return [
        {
          type: type === 'chore' && BUMP.test(text) ? 'deps' : type,
          subject: text.trim(),
          date,
          sha,
          ...(merge ? { pr: Number(merge.groups.number) } : {})
        }
      ];
    });

/**
 * Writes the changelog: a section per month, newest first, and in each a
 * heading per type (see `SECTIONS`), each entry linked to its pull request,
 * or to its commit when it was made straight to main.
 *
 * @param {ReturnType<typeof parseEntries>} entries - The entries, newest first.
 * @param {string} repository - The repository's web address, such as `https://github.com/phun-ky/site-interstellar`.
 * @returns {string} The changelog, in Markdown.
 */
export const renderChangelog = (entries, repository) => {
  const months = new Map();

  for (const entry of entries) {
    const month = entry.date.slice(0, 7);

    months.set(month, [...(months.get(month) ?? []), entry]);
  }

  const known = new Set(SECTIONS.map(([type]) => type));
  const link = ({ pr, sha }) =>
    pr
      ? `([#${pr}](${repository}/pull/${pr}))`
      : `([${sha.slice(0, 7)}](${repository}/commit/${sha}))`;
  const lines = [
    '# Changelog',
    '',
    'What has changed, month by month, newest first: the pull requests merged',
    'into main, and before them the commits made straight to it. Each merge',
    'is deployed to the site. Rebuilt with `npm run changelog`.'
  ];

  for (const [month, monthEntries] of months) {
    lines.push('', `## ${MONTH.format(new Date(`${month}-01T00:00:00Z`))}`);

    for (const [type, heading] of [...SECTIONS, ['other', 'Other']]) {
      const section = monthEntries.filter((entry) =>
        type === 'other' ? !known.has(entry.type) : entry.type === type
      );

      if (!section.length) continue;

      lines.push('', `### ${heading}`, '');
      section.forEach((entry) =>
        lines.push(`- ${entry.subject} ${link(entry)}`)
      );
    }
  }

  return `${lines.join('\n')}\n`;
};

/** The repository's web address, from `package.json`. */
const getRepository = () => {
  const { repository } = JSON.parse(readFileSync('package.json', 'utf8'));
  const url = typeof repository === 'string' ? repository : repository.url;

  return url.replace(/^git\+/, '').replace(/\.git$/, '');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // main as last fetched, so a branch's own commits are never listed
  const ref = process.argv[2] ?? 'origin/main';
  const log = execFileSync(
    'git',
    [
      'log',
      '--first-parent',
      `--format=%H${FIELD}%cs${FIELD}%P${FIELD}%s${FIELD}%b${RECORD}`,
      ref
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const entries = parseEntries(log);

  writeFileSync('CHANGELOG.md', renderChangelog(entries, getRepository()));
  console.log(`CHANGELOG.md: ${entries.length} entries from ${ref}`);
}
