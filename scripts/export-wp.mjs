// scripts/export-wp.mjs
// Exports all pages + posts from pcrepairsnorthlakes.com.au into Astro content files.
//
// Install once:   npm install -D turndown node-html-parser
// Run:            node scripts/export-wp.mjs
// Run again without re-downloading images:   node scripts/export-wp.mjs --no-images
//
// Output:
//   src/content/pages/<slug>.md      (154 pages)
//   src/content/posts/<slug>.md      (127 blog posts)
//   public/wp-content/uploads/...    (images, same paths as WordPress, so image URLs stay the same)
//   export-raw/*.json                (raw API data, for reference only - gitignored)
//   export-raw/urls.csv              (every old URL with title / description / H1, for checking later)

import fs from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';
import { parse } from 'node-html-parser';

const SITE = 'https://www.pcrepairsnorthlakes.com.au';
const API = `${SITE}/wp-json/wp/v2`;
const DOWNLOAD_IMAGES = !process.argv.includes('--no-images');
const CONCURRENCY = 1; // one request at a time: the site is behind Cloudflare, which blocks fast scrapers
const DELAY_MS = 2500; // pause between live page requests
const FORCE = process.argv.includes('--force'); // ignore the SEO cache and re-fetch every live page
const SKIP_SLUGS = new Set(['login-customizer']); // WordPress plugin page, not real content

const ROOT = process.cwd();
const OUT_PAGES = path.join(ROOT, 'src/content/pages');
const OUT_POSTS = path.join(ROOT, 'src/content/posts');
const OUT_PUBLIC = path.join(ROOT, 'public');
const OUT_RAW = path.join(ROOT, 'export-raw');

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

async function fetchRetry(url, { as = 'text', tries = 4 } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 404) return { status: 404 };
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      const body = as === 'json' ? await res.json() : as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text();
      return { status: res.status, headers: res.headers, body };
    } catch (err) {
      if (i === tries) throw new Error(`${url} -> ${err.message}`);
      // 403/429 = Cloudflare rate limit: back off for much longer
      const wait = err.status === 403 || err.status === 429 ? 30000 * i : 3000 * i;
      console.warn(`  retry ${i}/${tries - 1} in ${wait / 1000}s: ${url} (${err.message})`);
      await sleep(wait);
    }
  }
}

async function fetchAll(endpoint, fields) {
  const items = [];
  for (let page = 1; ; page++) {
    const url = `${API}/${endpoint}?per_page=100&page=${page}${fields ? `&_fields=${fields}` : ''}`;
    const res = await fetchRetry(url, { as: 'json' });
    if (res.status === 404 || !Array.isArray(res.body) || res.body.length === 0) break;
    items.push(...res.body);
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
    console.log(`  ${endpoint}: page ${page}/${totalPages}`);
    if (page >= totalPages) break;
  }
  return items;
}

async function pool(items, worker, size = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    })
  );
  return results;
}

const decode = (s = '') => parse(`<p>${s}</p>`).text.trim(); // decode &amp; &#8217; etc.

// JSON is valid YAML, so JSON.stringify gives safe frontmatter values
function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

const csvCell = (v = '') => `"${String(v).replace(/"/g, '""')}"`;

// ---------- SEO from the live page ----------
// Rank Math doesn't expose SEO data in the API, so read it from each live page's <head>.

// Cached per URL in export-raw/seo-cache, so a re-run only fetches pages that failed or weren't done yet
async function getLiveSeo(url) {
  const cacheFile = path.join(OUT_RAW, 'seo-cache', new URL(url).pathname.replace(/[^a-z0-9]+/gi, '_') + '.json');
  if (!FORCE) {
    try { return { ...JSON.parse(await fs.readFile(cacheFile, 'utf8')), cached: true }; } catch {}
  }
  const seo = await fetchLiveSeo(url);
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(cacheFile, JSON.stringify(seo));
  await sleep(DELAY_MS);
  return seo;
}

async function fetchLiveSeo(url) {
  const res = await fetchRetry(url);
  if (res.status === 404) return { status: 404 };
  const doc = parse(res.body);
  const meta = (sel) => doc.querySelector(sel)?.getAttribute('content')?.trim();
  const schema = doc
    .querySelectorAll('script[type="application/ld+json"]')
    .map((s) => {
      try { return JSON.parse(s.text); } catch { return null; }
    })
    .filter(Boolean);
  return {
    status: res.status,
    seoTitle: decode(doc.querySelector('title')?.text || ''),
    description: meta('meta[name="description"]'),
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    robots: meta('meta[name="robots"]'),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
    ogImage: meta('meta[property="og:image"]'),
    h1: doc.querySelectorAll('h1').map((h) => h.text.trim()).filter(Boolean),
    schema,
  };
}

// ---------- images ----------

const imageUrls = new Set();
const UPLOADS_RE = /https?:\/\/(?:www\.)?pcrepairsnorthlakes\.com\.au(\/wp-content\/uploads\/[^"'\s)?#]+)/g;

function collectImages(html = '') {
  for (const m of html.matchAll(UPLOADS_RE)) imageUrls.add(m[1]);
}

// Make image links root-relative (/wp-content/uploads/...) so they work on the new site
const localiseLinks = (html = '') =>
  html
    .replace(UPLOADS_RE, '$1')
    // internal page links -> root-relative, keeps the exact same URL paths
    .replace(/href="https?:\/\/(?:www\.)?pcrepairsnorthlakes\.com\.au(\/[^"]*)?"/g, (_, p) => `href="${p || '/'}"`);

async function downloadImage(p) {
  const dest = path.join(OUT_PUBLIC, decodeURIComponent(p));
  try {
    await fs.access(dest);
    return 'skipped';
  } catch {}
  const res = await fetchRetry(SITE + p, { as: 'buffer' });
  if (res.status === 404) return 'missing';
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, res.body);
  return 'ok';
}

// ---------- markdown ----------

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.keep(['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td']); // keep embeds + tables as HTML
td.remove(['script', 'style']);

// ---------- main ----------

const failed = [];

async function exportItems(type, items, outDir, lookups) {
  await fs.mkdir(outDir, { recursive: true });
  const rows = [];

  await pool(items, async (item) => {
    if (SKIP_SLUGS.has(item.slug)) return;
    const url = item.link;
    const urlPath = new URL(url).pathname; // e.g. /computer-repairs-chermside/
    const html = item.content?.rendered || '';
    collectImages(html);

    let seo;
    try {
      seo = await getLiveSeo(url);
    } catch (err) {
      // Content still comes from the API; only the live SEO tags are missing -> fill those in by hand
      failed.push(url);
      console.warn(`  SEO MISSING ${type} ${urlPath} (${err.message.split('-> ').pop()}) - content saved, add SEO manually`);
      seo = { status: 'blocked', seoMissing: true };
    }
    if (seo.ogImage) collectImages(seo.ogImage);

    const bodyHtml = localiseLinks(html);
    const markdown = td.turndown(bodyHtml).trim();
    const textLength = parse(html).text.replace(/\s+/g, ' ').trim().length;
    const isHome = urlPath === '/';
    const fileSlug = isHome ? 'index' : item.slug;

    const fm = {
      title: decode(item.title?.rendered),
      slug: item.slug,
      path: urlPath,
      seoTitle: seo.seoTitle,
      description: seo.description,
      canonical: seo.canonical,
      robots: seo.robots,
      ogTitle: seo.ogTitle,
      ogDescription: seo.ogDescription,
      ogImage: seo.ogImage ? localiseLinks(`"${seo.ogImage}"`).slice(1, -1) : undefined,
      h1: seo.h1?.[0],
      template: item.template || undefined,
      parent: item.parent || undefined,
      date: item.date,
      modified: item.modified,
      categories: (item.categories || []).map((id) => lookups.categories[id]).filter(Boolean),
      tags: (item.tags || []).map((id) => lookups.tags[id]).filter(Boolean),
      emptyContent: textLength < 50 ? true : undefined, // flags the empty service pages
      seoMissing: seo.seoMissing, // live page was blocked: copy seoTitle + description from the browser
    };

    await fs.writeFile(path.join(outDir, `${fileSlug}.md`), frontmatter(fm) + '\n' + markdown + '\n');
    if (seo.schema?.length) {
      await fs.mkdir(path.join(OUT_RAW, 'schema', type), { recursive: true });
      await fs.writeFile(path.join(OUT_RAW, 'schema', type, `${fileSlug}.json`), JSON.stringify(seo.schema, null, 2));
    }

    rows.push([type, urlPath, seo.status, fm.title, fm.seoTitle, fm.description, fm.h1, fm.canonical, textLength, fm.emptyContent ? 'EMPTY' : '']);
    console.log(`  ${type} ${urlPath}${seo.cached ? ' (cached)' : ''}${fm.emptyContent ? '  <-- EMPTY' : ''}`);
  });

  return rows;
}

async function main() {
  await fs.mkdir(OUT_RAW, { recursive: true });

  console.log('Fetching from WordPress API...');
  const [pages, posts, categories, tags] = [
    await fetchAll('pages'),
    await fetchAll('posts'),
    await fetchAll('categories', 'id,slug,name,link,count'),
    await fetchAll('tags', 'id,slug,name,link,count'),
  ];
  console.log(`Found ${pages.length} pages, ${posts.length} posts, ${categories.length} categories, ${tags.length} tags`);

  for (const [name, data] of Object.entries({ pages, posts, categories, tags })) {
    await fs.writeFile(path.join(OUT_RAW, `${name}.json`), JSON.stringify(data, null, 2));
  }

  const lookups = {
    categories: Object.fromEntries(categories.map((c) => [c.id, c.slug])),
    tags: Object.fromEntries(tags.map((t) => [t.id, t.slug])),
  };

  console.log('\nExporting pages...');
  const pageRows = await exportItems('page', pages, OUT_PAGES, lookups);
  console.log('\nExporting posts...');
  const postRows = await exportItems('post', posts, OUT_POSTS, lookups);

  // category + tag archive URLs, so they're in the URL list for the redirect / keep decision
  const archiveRows = [...categories.map((c) => ['category', c]), ...tags.map((t) => ['tag', t])].map(([type, t]) => [
    type, new URL(t.link).pathname, '', t.name, '', '', '', '', t.count, '',
  ]);

  const header = ['type', 'path', 'status', 'title', 'seoTitle', 'description', 'h1', 'canonical', 'textLength', 'flag'];
  const csv = [header, ...pageRows, ...postRows, ...archiveRows].map((r) => r.map(csvCell).join(',')).join('\n');
  await fs.writeFile(path.join(OUT_RAW, 'urls.csv'), csv);

  if (DOWNLOAD_IMAGES) {
    console.log(`\nDownloading ${imageUrls.size} images used in content...`);
    const results = await pool([...imageUrls], async (p) => {
      try { return await downloadImage(p); } catch (e) { console.warn('  FAILED', p); return 'failed'; }
    });
    const count = (s) => results.filter((r) => r === s).length;
    console.log(`  ok: ${count('ok')}, already had: ${count('skipped')}, missing: ${count('missing')}, failed: ${count('failed')}`);
    if (count('failed')) console.log('  Run the script again to retry failed images (already downloaded ones are skipped).');
  } else {
    await fs.writeFile(path.join(OUT_RAW, 'images.txt'), [...imageUrls].join('\n'));
    console.log(`\nSkipped image download. ${imageUrls.size} image paths saved to export-raw/images.txt`);
  }

  const empty = [...pageRows, ...postRows].filter((r) => r[9] === 'EMPTY').map((r) => r[1]);
  console.log(`\nDone. ${pageRows.length} pages, ${postRows.length} posts exported.`);
  console.log(`${empty.length} pages have empty content:\n  ${empty.join('\n  ')}`);
  if (failed.length) {
    console.log(`\n${failed.length} URLs: content saved, but SEO title/description could not be read (marked seoMissing: true).`);
    console.log('Run again later to retry, or open each in your browser and copy the title + meta description in by hand:');
    console.log('  ' + failed.join('\n  '));
  } else {
    console.log('\nAll URLs exported successfully.');
  }
}

main().catch((err) => {
  console.error('\nExport failed:', err.message);
  process.exit(1);
});