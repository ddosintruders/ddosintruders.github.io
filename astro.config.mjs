// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://adnan-ahmed.pages.dev',
  output: 'static',
  /**
   * No UI framework integration, deliberately.
   *
   * The cursor and the hero backdrop were the only two islands, and neither
   * used anything beyond useEffect/useRef. Carrying React for them cost 187 KB
   * of runtime — roughly half the page's JavaScript — to render two elements
   * that manipulate the DOM directly anyway. Both are now plain Astro
   * components with vanilla scripts.
   */
  integrations: [
    /*
     * Emits sitemap-index.xml + sitemap-0.xml, built from `site` above.
     * Change `site` when the final domain is known and both the sitemap and
     * robots.txt follow automatically — neither hardcodes the URL.
     */
    sitemap(),
  ],
  image: {
    // Archive shots are large PNG/JPG exports from the old site; sharp handles
    // the WebP/AVIF conversion the previous build never did.
    responsiveStyles: true,
  },
  security: {
    /**
     * Astro emits a <meta http-equiv="content-security-policy"> containing a
     * per-build hash for every inline script and style it generates.
     *
     * This has to be Astro's job, not a hand-written header. Island hydration
     * (`client:load`, `client:idle`) ships as inline scripts whose contents —
     * and therefore hashes — change on every build. A static `script-src 'self'`
     * in _headers blocked all six of them: the hero's WebGL backdrop and the
     * custom cursor silently never hydrated. Caught by scripts/csp-check.mjs.
     *
     * frame-ancestors is deliberately absent: it is ignored in a meta CSP, so
     * clickjacking protection is carried by X-Frame-Options in public/_headers.
     */
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        // Formspree receives the contact form, both as a native POST and via
        // the progressive-enhancement fetch.
        "connect-src 'self' https://formspree.io",
        "form-action 'self' https://formspree.io",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      styleDirective: {
        /**
         * 'unsafe-inline' is scoped to `style-src-attr`, not to `style-src`.
         *
         * Per the CSP spec, 'unsafe-inline' is *ignored* in any directive that
         * also carries a hash — and Astro adds style hashes automatically. So
         * listing it at default scope silently did nothing, and every
         * server-rendered `style="…"` attribute was blocked (the archive's
         * per-image opacity, the preloader curtain). Scoping it to the
         * attribute directive keeps `style-src` hash-locked for real
         * stylesheets while letting those attributes through.
         */
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
      scriptDirective: {
        resources: ["'self'"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
