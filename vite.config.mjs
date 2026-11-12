import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import pack from './package.json' with { type: 'json' };
import { addContentSecurityPolicy } from './src/config/csp.ts';

const banner = `/**
 * ${pack.name}
 * ${pack.description}
 * @author ${pack.author}
 * @version ${pack.version}
 * @license
 * Copyright (c) 2025-${new Date().getFullYear()} Alexander Vassbotn Røyne-Helgesen
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */`;
/**
 * Where the site is published: the canonical URL and the social card start
 * here, and `base` is its path.
 */
const SITE_URL = 'https://phun-ky.net/site-interstellar/';

export default defineConfig({
  // Served from GitHub Pages at SITE_URL
  base: new URL(SITE_URL).pathname,
  publicDir: 'public',
  // No fallback to index.html for unknown paths, as on GitHub Pages
  appType: 'mpa',
  server: {
    port: 3000
  },
  preview: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Keep every asset a file: the Content Security Policy allows no
    // `data:` URIs, and small font subsets would otherwise be inlined
    assetsInlineLimit: 0,
    // Every browser the site supports preloads modules itself, so the
    // polyfill for the lazily loaded Bodies drawer (#14) is dead weight
    modulePreload: { polyfill: false },
    rolldownOptions: {
      // The app, and the page GitHub Pages serves for unknown paths
      input: {
        main: 'index.html',
        notFound: '404.html'
      },
      output: {
        postBanner: banner,
        entryFileNames: 'js/main.js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.names.some((name) => name.endsWith('.css'))) {
            return 'assets/[name]-[hash][extname]';
          }

          // The lazily loaded Bodies drawer's styles (#14)
          if (assetInfo.names.some((name) => name.startsWith('bodies'))) {
            return 'css/bodies-[hash].css';
          }

          // Named after the entry: `notFound.css` comes from 404.html
          return assetInfo.names.includes('notFound.css')
            ? 'css/not-found.css'
            : 'css/interstellar.css';
        }
      }
    }
  },
  plugins: [
    // The site URL in the pages: the canonical URL and the social card.
    // No robots.txt or sitemap.xml until the site has a domain of its own
    // (#39): crawlers read them at the root of a host only
    {
      name: 'site-metadata',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL)
      }
    },
    // The policy goes into the built page only: the dev server injects
    // inline styles that it would block
    {
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: (html) => addContentSecurityPolicy(html)
      }
    },
    // `vite preview` answers unknown paths with 404.html and status 404,
    // as GitHub Pages does
    {
      name: 'preview-not-found',
      configurePreviewServer: (server) => () => {
        const { root, build } = server.config;
        const outDir = resolve(root, build.outDir);

        server.middlewares.use((request, response, next) => {
          // Vite serves index.html after this, once it has rewritten `/`
          const path = decodeURIComponent(request.url?.split('?')[0] ?? '');

          if (existsSync(join(outDir, path))) return next();

          response.statusCode = 404;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(readFileSync(join(outDir, '404.html')));
        });
      }
    },
    // Serve and copy `src/assets` to the web root, like `public/`
    viteStaticCopy({
      targets: [{ src: 'src/assets/**/*', dest: '.', rename: { stripBase: 2 } }]
    })
  ]
});
