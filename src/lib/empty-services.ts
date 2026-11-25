// Which WordPress service pages are empty (title only, no text) AND have a card on /services/.
// Bilal's decision: links to those pages go to their card instead, e.g. /data-recovery/ -> /services/#data-recovery.
// Used by src/middleware.ts (rewrites the links) and the Services template (marks the cards).
// Built from the content, so when a page gets real text (no longer `emptyContent: true`) it drops out by itself.
import { getCollection } from 'astro:content';
import { pathSlug } from './services';

let cache: Promise<Map<string, string>> | undefined;

async function build() {
  const pages = await getCollection('pages');
  const services = pages.find((p) => p.data.path === '/services/');
  // Every link that is a card heading on /services/: "## [Name](/link/)"
  const cardSlugs = new Set(
    [...(services?.body ?? '').matchAll(/^## \[[^\]]+\]\(([^)]+)\)/gm)].map((m) => pathSlug(m[1])).filter(Boolean),
  );
  const map = new Map<string, string>(); // slug -> new href
  for (const p of pages) {
    const slug = pathSlug(p.data.path);
    if (p.data.emptyContent && cardSlugs.has(slug)) map.set(slug, `/services/#${slug}`);
  }
  return map;
}

/** slug of an empty service page -> "/services/#slug" */
export const emptyServiceRedirects = () => (cache ??= build());
