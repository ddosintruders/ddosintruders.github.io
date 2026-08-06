/**
 * Serves dist/ with the exact Content-Security-Policy from public/_headers and
 * reports any violation the browser raises.
 *
 * `astro preview` does not apply _headers, so without this the CSP would ship
 * completely untested — and a CSP that blocks your own bundle is a blank page
 * in production that never appears in local testing.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DIST = path.resolve('dist');
const PORT = 4399;

/**
 * The CSP is emitted by Astro as a <meta> tag inside dist/index.html, so it is
 * already self-enforcing when the file is served. It is read here purely to
 * print what is under test, and to fail loudly if the config ever stops
 * producing one.
 */
const indexHtml = await readFile(path.join(DIST, 'index.html'), 'utf8');
// Match the double-quoted content attribute only — the policy itself is full of
// single quotes ('self', 'unsafe-inline'), so a ["'] character class truncates
// the value at the first directive keyword.
const metaMatch = indexHtml.match(
  /<meta\s+http-equiv="content-security-policy"\s+content="([^"]+)"/i,
);

if (!metaMatch) {
  throw new Error(
    'No CSP meta tag in dist/index.html — is security.csp still set in astro.config.mjs?',
  );
}
const csp = metaMatch[1];
console.log(`CSP under test (from dist/index.html meta):\n  ${csp}\n`);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    // No CSP header is set: the meta tag in the served HTML is the real policy,
    // exactly as it will behave on Cloudflare Pages.
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const violations = [];
const otherErrors = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (/content security policy|refused to/i.test(text)) violations.push(text);
  else if (msg.type() === 'error') otherErrors.push(text);
});
page.on('pageerror', (err) => otherErrors.push(`pageerror: ${err.message}`));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));

// Exercise the parts that need connect-src / form-action.
const runtime = await page.evaluate(() => ({
  heroVisible:
    getComputedStyle(document.querySelector('[data-hero-line]')).opacity !== '0',
  webglCanvas: !!document.querySelector('#hero canvas'),
  jsonLd: !!document.querySelector('script[type="application/ld+json"]'),
  jsonLdParsed: (() => {
    try {
      const el = document.querySelector('script[type="application/ld+json"]');
      return !!JSON.parse(el?.textContent ?? '').name;
    } catch {
      return false;
    }
  })(),
  gsapRan: !!document.querySelector('[data-hero-title] .line-mask'),
  lenis: document.documentElement.classList.contains('lenis'),
}));

console.log('--- runtime under CSP ---');
console.log(JSON.stringify(runtime, null, 1));
console.log(`\nCSP violations: ${violations.length}`);
violations.forEach((v) => console.log(`  ! ${v}`));
console.log(`Other console errors: ${otherErrors.length}`);
otherErrors.forEach((v) => console.log(`  ! ${v}`));

await browser.close();
server.close();
