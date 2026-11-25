// EMPTY SERVICE PAGES -> /services/
//
// On WordPress, many single service pages (Data Recovery, NBN Setup, Website Hosting...) are empty:
// a title and no text. Bilal's decision: until the client sends content for them, every link to one
// of those pages goes to its card on the Services page instead, e.g. /data-recovery/ -> /services/#data-recovery.
//
// At build time this rewrites the href of every <a> that points at one of those pages (list in
// src/lib/empty-services.ts). The .md files are NOT changed, so once a page gets real content its old
// links come back by themselves. The empty pages still exist at their own URLs.
import { defineMiddleware } from 'astro:middleware';
import { emptyServiceRedirects } from './lib/empty-services';
import { pathSlug } from './lib/services';

const SITE = /^https?:\/\/(?:www\.)?pcrepairsnorthlakes\.com\.au/i;

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const map = await emptyServiceRedirects();
  if (map.size === 0) return response;

  const html = await response.text();
  // Only <a href="..."> (never canonical / og tags), and only links to this site
  const out = html.replace(/(<a\b[^>]*?\bhref=)(["'])([^"']*)\2/gi, (all, start: string, q: string, href: string) => {
    const local = href.replace(SITE, '');
    if (!local.startsWith('/')) return all;
    const target = map.get(pathSlug(local));
    return target ? `${start}${q}${target}${q}` : all;
  });
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(out, { status: response.status, statusText: response.statusText, headers });
});
