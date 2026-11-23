// Renders the release banners for a major release into media/, in the
// Mission HUD of the site and its social card: four formats (banner, og,
// square and portrait), each at 1x and 2x, as palette PNGs. The nav chart on
// each banner is drawn from the planets in @interstellar-tools/constants.
//
// Usage: npm run banners -- <release>, e.g. 1.0
// The content is in scripts/banners/<release>.mjs. Rendering uses a local
// Chrome (CHROME=/path/to/chrome to choose one), the headings font installed
// through Fontsource and the site's system fonts, so nothing is fetched from
// the network, and Python with Pillow, built with libimagequant (most system
// packages are), to make the PNGs small.
import { PLANETS } from '@interstellar-tools/constants';

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
// Not in public/: the build ships only files the site asks for
const OUT = join(ROOT, 'media');
const CHROME = process.env.CHROME ?? 'google-chrome';
// `chart` is the size of the nav chart in the panel
const FORMATS = [
  {
    suffix: '',
    width: 1200,
    height: 600,
    layout: 'wide',
    chart: [444, 382]
  },
  {
    suffix: '-og',
    width: 1200,
    height: 630,
    layout: 'wide',
    chart: [444, 412]
  },
  {
    suffix: '-square',
    width: 1080,
    height: 1080,
    layout: 'tall',
    chart: [892, 330]
  },
  {
    suffix: '-portrait',
    width: 1080,
    height: 1350,
    layout: 'tall',
    chart: [892, 452]
  }
];
const SCALES = [1, 2];
const release = process.argv[2];

if (!release) {
  console.error('Usage: npm run banners -- <release>, e.g. 1.0');
  process.exit(1);
}

const { default: content } = await import(
  pathToFileURL(join(ROOT, `scripts/banners/${release}.mjs`)).href
);
const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
const font = (weight) =>
  pathToFileURL(
    join(
      ROOT,
      `node_modules/@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-${weight}-normal.woff2`
    )
  ).href;
// The mark from the site's header, so the two never drift apart
const mark = readFileSync(join(ROOT, 'index.html'), 'utf8')
  .match(/mc-brand"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/)[1]
  .replace(/class="int"\s+width="30"\s+height="30"/, 'class="mark"');
const title = content.title
  .map((part) =>
    typeof part === 'string'
      ? escape(part)
      : `<span class="accent">${escape(part.accent)}</span>`
  )
  .join('<br>');
/**
 * The nav chart: the Sun's glow at the left edge, and each planet on its
 * orbit, spaced on a log scale so the inner ones have room, above and below
 * the middle in turn. The locked planet and its orbit are amber.
 */
const chart = ([width, height]) => {
  const sun = { x: -0.06 * width, y: height / 2 };
  const planets = content.chart.planets.map((id) =>
    PLANETS.find((planet) => planet.id === id)
  );
  const logs = planets.map(({ orbit }) => Math.log(orbit.a.value));
  const [first, last] = [logs[0], logs.at(-1)];
  const size = Math.round(Math.min(width / 32, height / 15));
  // Room for half the longest name at either end
  const pad = size * 3;
  const bodies = planets.map((planet, index) => {
    const x =
      pad + ((logs[index] - first) / (last - first)) * (width - 2 * pad);
    const side = index % 2 ? -1 : 1;
    const dy = side * height * 0.24;

    return {
      planet,
      x,
      y: sun.y + dy,
      r: Math.hypot(x - sun.x, dy),
      labelY: sun.y + dy + side * size * 1.9 + (side > 0 ? size * 0.4 : 0),
      locked: planet.id === content.chart.lock
    };
  });

  // Every orbit before any label, so each label's halo hides the orbits
  return `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
  <defs><radialGradient id="glow">
    <stop offset="0" stop-color="#ffb547" stop-opacity="0.5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/>
  </radialGradient></defs>
  <circle cx="${sun.x}" cy="${sun.y}" r="${Math.min(width, height) * 0.32}" fill="url(#glow)"/>
  ${bodies
    .map(({ r, locked }) =>
      locked
        ? `<circle cx="${sun.x}" cy="${sun.y}" r="${r}" fill="none" stroke="#ffb547" stroke-width="2"/>`
        : `<circle cx="${sun.x}" cy="${sun.y}" r="${r}" fill="none" stroke="rgba(71, 184, 190, 0.45)" stroke-width="1.5" stroke-dasharray="5 6"/>`
    )
    .join('\n  ')}
  ${bodies
    .map(
      ({ planet, x, y, labelY, locked }) =>
        `${locked ? `<circle cx="${x}" cy="${y}" r="${size * 0.95}" fill="none" stroke="#ffb547" stroke-width="2.5"/>` : ''}
  <circle cx="${x}" cy="${y}" r="${size * 0.42}" fill="${planet.display.color}"/>
  <text x="${x}" y="${labelY}" fill="${locked ? '#ffb547' : '#aabcc6'}" font-size="${size}" stroke-width="${size * 0.7}" text-anchor="middle">${escape(planet.name.toUpperCase())}</text>`
    )
    .join('\n  ')}
</svg>`;
};
const page = (layout, format, size) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: 'IBM Plex Sans Condensed'; font-weight: 700; src: url(${font(700)}); }
/* The colours and font stacks of src/styles/main.css */
:root { --space: #050807; --panel: #0f1720; --grid: rgba(71, 184, 190, 0.07);
  --line: rgba(71, 184, 190, 0.22); --text: #dfe9ee; --muted: #aabcc6; --teal: #47b8be;
  --cyan: #4feff9; --amber: #ffb547;
  --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  --heading: 'IBM Plex Sans Condensed', var(--sans);
  --mono: 'Menlo for Powerline', 'Menlo Regular for Powerline', 'DejaVu Sans Mono', Consolas,
    Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 100%; height: 100%; }
body { position: relative; overflow: hidden; color: var(--muted); font-family: var(--sans);
  -webkit-font-smoothing: antialiased; background-color: var(--space);
  background-image: linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 32px 32px; }
/* The social card's frame: teal corners and the amber rule by the text */
main::before, main::after { content: ''; position: absolute; width: 24px; height: 24px;
  border: 2px solid var(--teal); }
main::before { top: 20px; left: 20px; border-right: 0; border-bottom: 0; }
main::after { right: 20px; bottom: 20px; border-left: 0; border-top: 0; }
.rule { position: absolute; left: 44px; width: 1px; background: var(--amber); }
/* Text sits on the background colour, never on a grid line */
.pill, .kicker, h1, p { position: absolute; background: var(--space);
  box-shadow: 0 0 16px 12px var(--space); }
.pill { display: inline-flex; align-items: center; gap: 14px; padding: 10px 20px 10px 14px;
  border: 1px solid var(--line); box-shadow: none; color: var(--teal);
  font: 18px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
.mark { width: 30px; height: 30px; color: var(--teal); }
.kicker { color: var(--amber); font: 18px var(--mono); letter-spacing: 0.14em;
  text-transform: uppercase; }
h1 { color: var(--text); font-family: var(--heading); font-weight: 700; line-height: 1.02;
  letter-spacing: 0.02em; text-transform: uppercase; }
.accent { color: var(--cyan); }
p { line-height: 1.5; }
/* As .mc-panel on the site, with its teal corner brackets */
.panel { position: absolute; padding: 20px 24px 24px 0; border: 1px solid var(--line);
  background: var(--panel); box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45); }
.panel::before, .panel::after { content: ''; position: absolute; width: 18px; height: 18px;
  border: 2px solid var(--teal); }
.panel::before { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
.panel::after { right: -2px; bottom: -2px; border-left: 0; border-top: 0; }
.panel header { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 14px;
  margin: 0 0 14px 24px; border-bottom: 1px solid var(--line); font: 14px var(--mono);
  letter-spacing: 0.12em; text-transform: uppercase; }
.panel header b { color: var(--amber); font-weight: 400; }
/* The chart runs to the panel's left edge, which cuts the Sun's glow */
.chart { display: block; font-family: var(--mono); letter-spacing: 0.1em; }
/* A halo in the panel's colour, so no orbit runs through a label */
.chart text { paint-order: stroke; stroke: var(--panel); stroke-linejoin: round; }
/* wide: text left, the chart right */
.wide .rule { top: 64px; bottom: 64px; }
.wide .pill { top: 64px; left: 72px; }
.wide .kicker { top: 166px; left: 72px; }
.wide h1 { top: 202px; left: 72px; width: 560px; font-size: 64px; }
.wide p { bottom: 64px; left: 72px; width: 540px; font-size: 20px; }
.wide .panel { top: 64px; right: 72px; }
/* tall: text on top, the chart below */
.tall .rule { top: 80px; bottom: 80px; }
.tall .pill { top: 80px; left: 80px; font-size: 22px; }
.tall .mark { width: 36px; height: 36px; }
.tall .kicker { top: 196px; left: 80px; font-size: 22px; }
.tall h1 { top: 240px; left: 80px; width: 920px; font-size: 100px; }
.tall p { top: 470px; left: 80px; width: 900px; font-size: 28px; }
.tall .panel { left: 80px; bottom: 80px; }
.tall .panel header { font-size: 17px; }
.square .tall .kicker { top: 180px; }
.square .tall h1 { top: 218px; font-size: 84px; }
.square .tall p { top: 410px; font-size: 25px; }
</style></head>
<body class="${format}"><main class="${layout}">
  <div class="rule"></div>
  <div class="pill">${mark}${escape(content.pill)}</div>
  <div class="kicker">${escape(content.kicker)}</div>
  <h1>${title}</h1>
  <p>${escape(content.body)}</p>
  <section class="panel">
    <header><span>${escape(content.chart.label)}</span><b>${escape(content.chart.status)}</b></header>
    ${chart(size)}
  </section>
</main></body></html>`;
// Pages from files, so they may load the fonts from disk
const dir = mkdtempSync(join(tmpdir(), 'banners-'));
const written = [];

mkdirSync(OUT, { recursive: true });

try {
  for (const { suffix, width, height, layout, chart: size } of FORMATS) {
    const file = join(dir, `${suffix || 'banner'}.html`);

    writeFileSync(file, page(layout, suffix.slice(1), size));

    for (const scale of SCALES) {
      const path = join(
        OUT,
        `interstellar-${content.slug}${suffix}${scale === 2 ? '@2x' : ''}.png`
      );

      execFileSync(
        CHROME,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--allow-file-access-from-files',
          // Time to load the fonts before the screenshot
          '--virtual-time-budget=2000',
          `--force-device-scale-factor=${scale}`,
          `--window-size=${width},${height}`,
          `--screenshot=${path}`,
          pathToFileURL(file).href
        ],
        { stdio: 'ignore' }
      );
      written.push(path);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// A palette of up to 256 colours keeps the artwork sharp and small.
// libimagequant keeps small areas, like the planets, in their own colour
execFileSync(
  'python3',
  [
    '-c',
    `import sys
from PIL import Image
for path in sys.argv[1:]:
    Image.open(path).convert('RGB').quantize(256, method=Image.Quantize.LIBIMAGEQUANT).save(path, optimize=True)`,
    ...written
  ],
  { stdio: 'inherit' }
);

for (const path of written) {
  console.log(`${path.slice(ROOT.length)}: ${statSync(path).size} bytes`);
}
