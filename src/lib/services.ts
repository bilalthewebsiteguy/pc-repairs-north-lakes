// Splits the exported Services page (src/content/pages/services.md) into parts so each part can be
// designed on its own. Every word comes from the exported file - nothing is retyped.
//
// WordPress structure:
//   ## Our Services
//   ## [Service name](/link/)   short description     (x41)
// Each service gets an anchor id. For a service whose own page is empty on WordPress, the id is that
// page's slug (e.g. "data-recovery"), because links to empty pages are sent to /services/#<slug>
// (Bilal's decision - see src/middleware.ts).
import { md } from './home';

export interface ServiceItem {
  title: string; // as written in WordPress
  href: string; // the WordPress link (rewritten at build time if that page is empty)
  id: string; // anchor id on /services/
  html: string; // description, inline HTML
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** "/data-recovery/" -> "data-recovery"; "/#laptop-repairs" or "/" -> "" */
export const pathSlug = (href: string) => href.replace(/[?#].*$/, '').replace(/^\/|\/$/g, '');

export async function servicesSections(body: string) {
  const chunks = body
    .split(/^## /m)
    .slice(1)
    .map((c) => {
      const nl = c.indexOf('\n');
      return { head: (nl < 0 ? c : c.slice(0, nl)).trim(), rest: nl < 0 ? '' : c.slice(nl + 1).trim() };
    });

  // First heading without a link: "Our Services"
  const titleChunk = chunks.find((c) => !/^\[/.test(c.head));
  const items: ServiceItem[] = [];
  for (const c of chunks) {
    const m = c.head.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) continue;
    const title = m[1].replace(/​/g, '').trim(); // drop an invisible zero-width space from WordPress
    const href = m[2].trim();
    const id = pathSlug(href) || slugify(title);
    const html = (await md(c.rest)).replace(/^<p>|<\/p>\s*$/g, '').trim();
    items.push({ title, href, id, html });
  }

  return { title: titleChunk?.head ?? '', titleId: slugify(titleChunk?.head ?? ''), items };
}
