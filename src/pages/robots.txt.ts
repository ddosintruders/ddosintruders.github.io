import type { APIRoute } from 'astro';

/**
 * robots.txt, generated rather than dropped in public/ so the sitemap URL is
 * derived from `site` in astro.config.mjs. A hardcoded copy would silently
 * point at the old domain the moment the site moves.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('sitemap-index.xml', site).href;

  /*
   * Nothing is disallowed, deliberately.
   *
   * /_astro/ holds the CSS and JS. Googlebot renders the page before indexing
   * it, so blocking those stops it seeing the real layout — a documented way to
   * hurt your own ranking. It would also hide the archive imagery from Google
   * Images. There is nothing here worth hiding from a crawler.
   */
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
