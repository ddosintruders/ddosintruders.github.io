/**
 * Generates public/og.png — the social share card.
 *
 * Base.astro points og:image and twitter:image at /og.png, so without this the
 * file 404s and every LinkedIn / Slack / WhatsApp share renders a blank
 * preview. Which, for a portfolio that gets shared by link, is the single most
 * visible thing to get wrong.
 *
 * Rendered rather than hand-drawn so it uses the real typefaces and the real
 * palette, and regenerates if either changes.
 *
 *   node scripts/make-og.mjs
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'og.png');

// Facebook/LinkedIn/X all read 1200x630 (1.91:1).
const WIDTH = 1200;
const HEIGHT = 630;

const font = (pkg, file) =>
  pathToFileURL(path.join(ROOT, 'node_modules', pkg, 'files', file)).href;

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Space Grotesk';
    src: url('${font('@fontsource-variable/space-grotesk', 'space-grotesk-latin-wght-normal.woff2')}') format('woff2');
    font-weight: 300 700;
  }
  @font-face {
    font-family: 'Geist';
    src: url('${font('@fontsource-variable/geist', 'geist-latin-wght-normal.woff2')}') format('woff2');
    font-weight: 100 900;
  }
  @font-face {
    font-family: 'Geist Mono';
    src: url('${font('@fontsource-variable/geist-mono', 'geist-mono-latin-wght-normal.woff2')}') format('woff2');
    font-weight: 100 900;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: #08090b;
    color: #f2f3f5;
    font-family: 'Geist', sans-serif;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* The same dot matrix the hero renders in WebGL, flattened to CSS. */
  .grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgb(255 255 255 / 0.10) 1px, transparent 1px);
    background-size: 26px 26px;
    mask-image: radial-gradient(ellipse 70% 70% at 78% 42%, #000 5%, transparent 68%);
  }

  .accent-wash {
    position: absolute;
    top: -18%;
    right: -12%;
    width: 620px;
    height: 620px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(200 247 81 / 0.16), transparent 65%);
  }

  .inner {
    position: relative;
    height: 100%;
    padding: 68px 76px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .eyebrow {
    font-family: 'Geist Mono', monospace;
    font-size: 17px;
    letter-spacing: 0.19em;
    text-transform: uppercase;
    color: #878e98;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #c8f751; }

  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 104px;
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 0.95;
  }

  .roles {
    margin-top: 26px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 33px;
    font-weight: 400;
    line-height: 1.38;
    letter-spacing: -0.015em;
    color: #f2f3f5;
  }
  .roles em { font-style: normal; color: #c8f751; }

  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    border-top: 1px solid rgb(255 255 255 / 0.10);
    padding-top: 26px;
  }

  .meta {
    font-family: 'Geist Mono', monospace;
    font-size: 17px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #7b828d;
  }

  .stat { display: flex; gap: 46px; }
  .stat div { text-align: right; }
  .stat b {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 36px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .stat b i { font-style: normal; color: #c8f751; }
  .stat span {
    font-family: 'Geist Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #7b828d;
  }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="accent-wash"></div>

  <div class="inner">
    <div class="eyebrow"><span class="dot"></span> Open to AI data &amp; tooling work</div>

    <div>
      <h1>Adnan Ahmed</h1>
      <p class="roles">
        Founding Software Engineer at <em>human depth</em>.<br>
        Human Data Expert at <em>micro1</em>.
      </p>
    </div>

    <div class="foot">
      <div class="meta">Nakuru, Kenya — Remote</div>
      <div class="stat">
        <div><b>95<i>%+</i></b><span>Quality score</span></div>
        <div><b>5</b><span>Tools shipped</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});

const page = await browser.newPage();
// deviceScaleFactor 2 then no resize: crisper text on retina share cards, at
// the cost of a 2400x1260 file. Well under the ~5MB most scrapers accept.
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluateHandle('document.fonts.ready');

const buffer = await page.screenshot({ type: 'png' });
await writeFile(OUT, buffer);

await browser.close();

console.log(`wrote ${OUT} (${(buffer.length / 1024).toFixed(1)} KB, ${WIDTH * 2}x${HEIGHT * 2})`);
