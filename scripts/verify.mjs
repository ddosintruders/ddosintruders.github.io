/**
 * Cross-sanity check harness.
 *
 * Drives the locally-installed Edge over CDP (puppeteer-core, no bundled
 * browser download) and runs the checks the design brief called for: responsive
 * overflow, scroll choreography, reduced-motion parity, keyboard order, contrast
 * and link validity.
 *
 *   node scripts/verify.mjs [baseUrl] [outDir]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const axeSource = await import('node:fs/promises').then((fs) => fs.readFile(axePath, 'utf8'));

const BASE = process.argv[2] ?? 'http://localhost:4321';
const OUT = process.argv[3] ?? path.resolve('verify-out');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1920, height: 1080 },
];

const report = { base: BASE, generated: new Date().toISOString(), checks: {} };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport, { reducedMotion = false, theme = 'dark' } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
  // prefers-color-scheme is emulated rather than localStorage being seeded, so
  // this exercises the actual requirement: pick up the device setting on open.
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
    { name: 'prefers-color-scheme', value: theme },
  ]);

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  // Let the preloader clear and the hero intro settle.
  await sleep(reducedMotion ? 800 : 2600);

  return { page, consoleErrors };
}

/** Walks the page in viewport-sized steps, capturing each and watching for overflow. */
async function scrollCapture(page, label, viewport) {
  const shots = [];
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.floor(viewport.height * 0.9);
  const stops = Math.min(14, Math.ceil(height / step));

  for (let i = 0; i < stops; i += 1) {
    const y = i * step;
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await sleep(650);
    const file = path.join(OUT, `${label}-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    shots.push(path.basename(file));
  }
  return shots;
}

/** scrollWidth > clientWidth means something is pushing the page sideways. */
async function overflowCheck(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const offenders = [];

    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.right > docWidth + 1 || rect.left < -1) {
        const style = getComputedStyle(el);
        if (style.position === 'fixed') return; // chrome overlays are expected
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString?.() ?? '').slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
    });

    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: docWidth,
      overflows: document.documentElement.scrollWidth > docWidth + 1,
      offenders: offenders.slice(0, 12),
    };
  });
}

/** Any content left transparent after a full scroll is content the reader lost. */
async function hiddenContentCheck(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(1800);

  return page.evaluate(() => {
    const stuck = [];
    document
      .querySelectorAll('[data-reveal-fade], [data-reveal], [data-hero-line]')
      .forEach((el) => {
        const s = getComputedStyle(el);
        if (s.opacity === '0' || s.visibility === 'hidden') {
          stuck.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').trim().slice(0, 70),
          });
        }
      });
    return { stuckCount: stuck.length, samples: stuck.slice(0, 10) };
  });
}

async function keyboardCheck(page) {
  return page.evaluate(() => {
    const focusables = Array.from(
      document.querySelectorAll(
        'a[href], button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });

    return {
      focusableCount: focusables.length,
      firstThree: focusables.slice(0, 3).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? '').trim().slice(0, 40) || el.getAttribute('aria-label') || '',
      })),
      hasSkipLink: focusables[0]?.getAttribute('href') === '#main',
      positiveTabindex: focusables.filter((el) => Number(el.getAttribute('tabindex')) > 0).length,
    };
  });
}

async function collectLinks(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('#')),
  );
}

/** Did the boot script resolve the theme to match the emulated OS setting? */
async function themeCheck(page, expected) {
  return page.evaluate((want) => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return {
      expected: want,
      attribute: root.getAttribute('data-theme'),
      matches: root.getAttribute('data-theme') === want,
      bg: styles.getPropertyValue('--color-bg').trim(),
      text: styles.getPropertyValue('--color-text').trim(),
      accent: styles.getPropertyValue('--color-accent').trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  }, expected);
}

/** Open the first archive lightbox and check it behaves like a modal should. */
async function dialogCheck(page) {
  await page.evaluate(() => {
    const details = document.querySelector('[data-archive]');
    if (details) details.open = true;
  });
  await sleep(600);

  const trigger = await page.$('[data-open-archive]');
  if (!trigger) return { error: 'no archive trigger found' };

  await trigger.click();
  await sleep(900);

  const opened = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return { open: false };

    const rect = dialog.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // Centred to within a pixel or two on both axes. This is the check that
    // Tailwind preflight's `margin: 0` reset would fail — it kills the UA
    // stylesheet's `margin: auto` and pins the dialog to the top-left.
    const offsetLeft = rect.left;
    const offsetRight = vw - rect.right;
    const offsetTop = rect.top;
    const offsetBottom = vh - rect.bottom;

    return {
      open: true,
      id: dialog.id,
      modal: dialog.matches(':modal'),
      rect: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
      viewport: { w: vw, h: vh },
      centredX: Math.abs(offsetLeft - offsetRight) <= 2,
      centredY: Math.abs(offsetTop - offsetBottom) <= 2,
      // Must sit entirely inside the viewport — the old one ran off the bottom.
      fitsViewport:
        rect.top >= -1 && rect.left >= -1 && rect.bottom <= vh + 1 && rect.right <= vw + 1,
      // The dialog itself must not scroll; only the thumb strip may.
      dialogScrolls:
        dialog.scrollHeight > dialog.clientHeight + 1 ||
        dialog.scrollWidth > dialog.clientWidth + 1,
      nestedScrollers: dialog.querySelectorAll('.overflow-y-auto').length,
      slides: dialog.querySelectorAll('[data-slide]').length,
      thumbs: dialog.querySelectorAll('[data-thumb]').length,
      hasCloseButton: !!dialog.querySelector('[data-close-archive]'),
      labelled: !!dialog.getAttribute('aria-labelledby'),
      liveRegion: !!dialog.querySelector('[data-gallery-status][aria-live]'),
      focusInsideDialog: !!document.activeElement && dialog.contains(document.activeElement),
      customCursorReleased: !document.documentElement.classList.contains('has-custom-cursor'),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  const readIndex = () =>
    page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      const visible = [...(dialog?.querySelectorAll('[data-slide]') ?? [])].findIndex(
        (el) => getComputedStyle(el).opacity === '1',
      );
      return {
        index: Number(dialog?.dataset.index ?? -1),
        visibleSlide: visible,
        counter: dialog?.querySelector('[data-gallery-counter]')?.textContent?.trim(),
        activeThumb: [...(dialog?.querySelectorAll('[data-thumb]') ?? [])].findIndex((el) =>
          el.hasAttribute('data-active'),
        ),
      };
    });

  const nav = { start: await readIndex() };

  await page.click('[data-gallery-next]');
  await sleep(500);
  nav.afterNext = await readIndex();

  await page.keyboard.press('ArrowRight');
  await sleep(500);
  nav.afterArrowRight = await readIndex();

  // Wrap-around: step back three from index 2 should land on the last slide.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await sleep(300);
  await page.keyboard.press('ArrowLeft');
  await sleep(500);
  nav.afterWrapBackwards = await readIndex();

  // A real pointer click at the element's centre, not element.click() — the
  // latter reports clientX/clientY of 0,0 and exercises a different code path
  // than an actual user.
  await page.click('dialog[open] [data-thumb="3"]');
  await sleep(500);
  nav.afterThumbClick = await readIndex();

  // Keyboard activation of a control must not be mistaken for a backdrop click.
  await page.focus('dialog[open] [data-gallery-next]');
  await page.keyboard.press('Enter');
  await sleep(500);
  nav.afterKeyboardNext = await readIndex();
  nav.survivedKeyboardActivation = await page.evaluate(
    () => !!document.querySelector('dialog[open]'),
  );

  await page.screenshot({ path: path.join(OUT, 'dialog-open.png') });

  // Esc must close it, and focus must come back to the card that opened it.
  await page.keyboard.press('Escape');
  await sleep(700);

  const closed = await page.evaluate(() => ({
    stillOpen: !!document.querySelector('dialog[open]'),
    focusRestored: document.activeElement?.hasAttribute('data-open-archive') ?? false,
    cursorRestored: document.documentElement.classList.contains('has-custom-cursor'),
  }));

  return { opened, nav, closed };
}

/** The gallery must survive small screens, where it has the least room. */
async function dialogMobileCheck(browser) {
  const { page } = await newPage(browser, VIEWPORTS[0], { theme: 'dark' });
  await page.evaluate(() => {
    const details = document.querySelector('[data-archive]');
    if (details) details.open = true;
  });
  await sleep(600);
  await page.evaluate(() => document.querySelector('[data-open-archive]')?.click());
  await sleep(1200);

  const result = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return { open: false };
    const rect = dialog.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    return {
      open: true,
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      viewport: { w: vw, h: vh },
      fitsViewport: rect.bottom <= vh + 1 && rect.right <= vw + 1 && rect.top >= -1,
      dialogScrolls: dialog.scrollHeight > dialog.clientHeight + 1,
      // Arrows and thumbs are the whole navigation model on touch.
      navVisible: !!dialog.querySelector('[data-gallery-next]'),
    };
  });

  await page.screenshot({ path: path.join(OUT, 'dialog-mobile.png') });
  await page.close();
  return result;
}

async function runAxe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        sample: v.nodes[0]?.html?.slice(0, 160),
        targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
      })),
      passCount: results.passes.length,
    };
  });
}

// ---------------------------------------------------------------------------

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});

try {
  // Responsive sweep
  report.checks.responsive = {};
  for (const viewport of VIEWPORTS) {
    const { page, consoleErrors } = await newPage(browser, viewport);
    const overflow = await overflowCheck(page);
    const shots = await scrollCapture(page, viewport.name, viewport);
    report.checks.responsive[viewport.name] = { overflow, shots, consoleErrors };
    await page.close();
  }

  // Full-scroll integrity on desktop
  {
    const { page, consoleErrors } = await newPage(browser, VIEWPORTS[2]);
    report.checks.hiddenContent = await hiddenContentCheck(page);
    report.checks.keyboard = await keyboardCheck(page);
    report.checks.links = await collectLinks(page);
    report.checks.axe = await runAxe(page);
    report.checks.consoleErrorsDesktop = consoleErrors;
    await page.close();
  }

  /*
    Both themes get a full contrast audit.
    The palettes share no colour values, so a pass in dark says nothing at all
    about light — the accent in particular is a completely different hue there.
  */
  report.checks.themes = {};
  for (const theme of ['dark', 'light']) {
    const { page, consoleErrors } = await newPage(browser, VIEWPORTS[2], { theme });
    report.checks.themes[theme] = {
      resolved: await themeCheck(page, theme),
      axe: await runAxe(page),
      overflow: await overflowCheck(page),
      consoleErrors,
    };
    await page.screenshot({ path: path.join(OUT, `theme-${theme}-hero.png`) });
    await page.evaluate(() => document.querySelector('#tooling')?.scrollIntoView());
    await sleep(1400);
    await page.screenshot({ path: path.join(OUT, `theme-${theme}-tooling.png`) });
    await page.evaluate(() => document.querySelector('#contact')?.scrollIntoView());
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, `theme-${theme}-contact.png`) });
    await page.close();
  }

  // Archive lightbox, checked in light theme so it is covered there too.
  {
    const { page, consoleErrors } = await newPage(browser, VIEWPORTS[2], { theme: 'light' });
    report.checks.dialog = await dialogCheck(page);
    report.checks.dialog.consoleErrors = consoleErrors;
    await page.close();

    report.checks.dialogMobile = await dialogMobileCheck(browser);
  }

  // Reduced motion parity
  {
    const { page, consoleErrors } = await newPage(browser, VIEWPORTS[2], { reducedMotion: true });
    report.checks.reducedMotion = {
      hidden: await hiddenContentCheck(page),
      overflow: await overflowCheck(page),
      shots: await scrollCapture(page, 'reduced', VIEWPORTS[2]),
      consoleErrors,
    };
    await page.close();
  }

  // Archive opened — a big chunk of the page only exists after this toggle
  {
    const { page, consoleErrors } = await newPage(browser, VIEWPORTS[2]);
    await page.evaluate(() => {
      const details = document.querySelector('[data-archive]');
      if (details) details.open = true;
    });
    await sleep(2500);
    await page.evaluate(() => {
      document.querySelector('#archive')?.scrollIntoView({ behavior: 'instant' });
    });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, 'archive-open.png') });

    // The cards sit below the fold of that scroll position, and their images
    // are lazy — step down so the grid itself is actually captured.
    for (let i = 1; i <= 2; i += 1) {
      await page.evaluate((n) => window.scrollBy({ top: n * 700, behavior: 'instant' }), 1);
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, `archive-cards-${i}.png`) });
    }
    report.checks.archiveOpen = {
      overflow: await overflowCheck(page),
      consoleErrors,
    };
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

// Console summary
const r = report.checks;
console.log('\n=== VERIFY SUMMARY ===');
for (const [name, data] of Object.entries(r.responsive)) {
  console.log(
    `${name.padEnd(8)} overflow=${data.overflow.overflows} ` +
      `(${data.overflow.scrollWidth}/${data.overflow.clientWidth}) ` +
      `offenders=${data.overflow.offenders.length} errors=${data.consoleErrors.length}`,
  );
}
console.log(`hidden-after-scroll : ${r.hiddenContent.stuckCount}`);
console.log(`reduced-motion hidden: ${r.reducedMotion.hidden.stuckCount}`);
console.log(`reduced-motion overflow: ${r.reducedMotion.overflow.overflows}`);
console.log(`archive-open overflow: ${r.archiveOpen.overflow.overflows}`);
console.log(`focusables=${r.keyboard.focusableCount} skipLink=${r.keyboard.hasSkipLink}`);
console.log(`axe violations: ${r.axe.violations.length}`);
for (const v of r.axe.violations) {
  console.log(`  - [${v.impact}] ${v.id} (${v.nodes}) ${v.help}`);
  console.log(`      ${v.targets.join(' | ')}`);
}

console.log('\n--- themes ---');
for (const [name, data] of Object.entries(r.themes)) {
  const t = data.resolved;
  console.log(
    `${name.padEnd(6)} resolved=${t.matches} attr=${t.attribute} bg=${t.bg} accent=${t.accent}`,
  );
  console.log(
    `       axe=${data.axe.violations.length} overflow=${data.overflow.overflows} errors=${data.consoleErrors.length}`,
  );
  for (const v of data.axe.violations) {
    console.log(`         ! [${v.impact}] ${v.id} (${v.nodes}) ${v.help}`);
    console.log(`           ${v.targets.join(' | ')}`);
  }
}

console.log('\n--- archive gallery (desktop) ---');
console.log(JSON.stringify(r.dialog, null, 1));
console.log('\n--- archive gallery (mobile) ---');
console.log(JSON.stringify(r.dialogMobile, null, 1));
console.log(`console errors (desktop): ${r.consoleErrorsDesktop.length}`);
r.consoleErrorsDesktop.forEach((e) => console.log(`  ! ${e}`));
console.log(`\nreport: ${path.join(OUT, 'report.json')}`);
