/**
 * Targeted diagnostics: identify fixed overlays, and confirm that every
 * animated text value settles on its true content rather than on a transient
 * frame. A counter stuck at 80 or an eyebrow frozen mid-scramble is a factual
 * error on the page, not a cosmetic one.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(3000);

// What is painting at the bottom centre of the viewport?
const atPoint = await page.evaluate(() => {
  const results = [];
  for (const [x, y] of [
    [640, 790],
    [600, 785],
    [700, 785],
    [640, 770],
  ]) {
    const el = document.elementFromPoint(x, y);
    results.push({
      point: `${x},${y}`,
      tag: el?.tagName?.toLowerCase() ?? null,
      cls: (el?.className?.toString?.() ?? '').slice(0, 80),
      id: el?.id ?? '',
      text: (el?.textContent ?? '').trim().slice(0, 40),
    });
  }

  const fixed = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    fixed.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className?.toString?.() ?? '').slice(0, 70),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      z: s.zIndex,
    });
  });

  return { atPoint: results, fixed };
});

// Scroll to the metrics and let every animation finish.
await page.evaluate(() => document.querySelector('#metrics')?.scrollIntoView());
await sleep(4000);

const settled = await page.evaluate(() => ({
  counters: Array.from(document.querySelectorAll('[data-counter]')).map((el) => ({
    expected: el.dataset.counter,
    actual: el.textContent?.trim(),
    ok: el.textContent?.trim() === el.dataset.counter,
  })),
}));

// Scroll the whole page so every scramble triggers, then let them all resolve.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 150));
  }
});
await sleep(3000);

const scrambles = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[data-scramble]')).map((el) => {
    const text = el.textContent?.trim() ?? '';
    return {
      text,
      // Settled eyebrows match "NN — WORD". Anything else is a frozen frame.
      ok: /^\d{2}\s—\s[A-Za-z ]+$/.test(text),
      residualMinWidth: el.style.minWidth || null,
    };
  }),
);

console.log('--- element at bottom-centre ---');
console.log(JSON.stringify(atPoint.atPoint, null, 1));
console.log('--- all fixed-position elements ---');
console.log(JSON.stringify(atPoint.fixed, null, 1));
console.log('--- counters settled ---');
console.log(JSON.stringify(settled.counters, null, 1));
console.log('--- scrambles settled ---');
console.log(JSON.stringify(scrambles, null, 1));

await browser.close();
