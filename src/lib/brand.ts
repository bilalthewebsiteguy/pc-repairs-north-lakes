// Splits the exported laptop-brand pages (Dell, Acer, ASUS, HP, Lenovo; Sony only has the areas list):
//   src/content/pages/<brand>-laptop(s)-common-problems.md
// Every word comes from the exported file - nothing is retyped.
//
// WordPress structure (2015 Elementor pages):
//   intro paragraph
//   "### <BRAND> Keyboard", "### Inverter", ... - one short paragraph per part (order differs per brand)
//   "Our software repairs include:" + "– " lines, "Our hardware repairs include:" + "– " lines
//   ## AREAS WE SERVE: + ### Moreton Bay Areas / ### Northside Suburbs (tables of suburb links)
import { slug } from 'github-slugger';
import { md } from './home';

// Real brand logos in public/images/brands/ (only these exist)
const LOGOS: Record<string, { src: string; w: number; h: number }> = {
  acer: { src: '/images/brands/acer.png', w: 301, h: 92 },
  asus: { src: '/images/brands/asus.png', w: 286, h: 50 },
  dell: { src: '/images/brands/dell.png', w: 250, h: 92 },
  hp: { src: '/images/brands/hp.png', w: 92, h: 92 },
  lenovo: { src: '/images/brands/lenovo.png', w: 251, h: 50 },
  sony: { src: '/images/brands/sony.png', w: 287, h: 50 },
};

/** "dell-laptop-common-problems" -> logo for "dell" (undefined if there is no logo file) */
export function brandLogo(pageSlug: string) {
  return LOGOS[pageSlug.split('-')[0]];
}

/** Which part of the laptop drawing a "###" heading is about (undefined = no hotspot, still listed). */
export type PartKey = 'lcd' | 'inverter' | 'keyboard' | 'touchpad' | 'overheat' | 'motherboard' | 'dcjack';
function partKey(title: string): PartKey | undefined {
  const t = title.toLowerCase();
  if (t.includes('lcd') || t.includes('backlight')) return 'lcd';
  if (t.includes('inverter')) return 'inverter';
  if (t.includes('keyboard')) return 'keyboard';
  if (t.includes('touc')) return 'touchpad'; // also matches the WordPress typo "ToucLENOVOad"
  if (t.includes('overheat')) return 'overheat';
  if (t.includes('motherboard')) return 'motherboard';
  if (t.includes('dc jack')) return 'dcjack';
  return undefined;
}

export interface BrandPart {
  title: string; // the "###" heading, unchanged
  id: string; // same id Astro gives the heading
  key?: PartKey;
}

/** The "###" part headings above "## AREAS WE SERVE" (in WordPress order). */
export function brandParts(body: string): BrandPart[] {
  const top = body.split(/^## /m)[0];
  return [...top.matchAll(/^### (.+)$/gm)].map((m) => {
    const title = m[1].trim();
    return { title, id: slug(title), key: partKey(title) };
  });
}

// Short hero facts, quoted word for word from the intro (a fact is dropped if the text changes)
const HERO_FACTS = ['running slow or not running at all', 'fix or upgrade your current system', 'a fraction of the cost of purchasing new'];

export function brandFacts(body: string) {
  const text = body.replace(/\s+/g, ' ');
  return HERO_FACTS.filter((f) => text.includes(f));
}

// ---------------------------------------------------------------- full page

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
const inline = async (s: string) => (await md(s)).replace(/^\s*<p>|<\/p>\s*$/g, '').trim();

export interface BrandPartFull extends BrandPart {
  paras: string[]; // HTML, one per paragraph (unchanged, including any leftover WordPress text)
  contact?: string; // a "Contact ..." paragraph that followed this part (shown as a call tile)
}
export interface BrandList {
  label: string; // "Our software repairs include:" - the WordPress text, unchanged
  kind: 'software' | 'hardware' | 'other';
  items: string[]; // HTML, the "– " lines without the dash
  extra: string[]; // any other text in that block (never dropped)
}

export async function brandSections(body: string) {
  const iAreas = body.search(/^## /m);
  const top = iAreas < 0 ? body : body.slice(0, iAreas);
  const areasRaw = iAreas < 0 ? '' : body.slice(iAreas);

  // the repair lists start at the first "Our ... repairs include:" line
  const iLists = top.search(/^Our .+ include:\s*$/m);
  const partsRaw = iLists < 0 ? top : top.slice(0, iLists);
  const listsRaw = iLists < 0 ? '' : top.slice(iLists);

  // intro + "###" parts
  const chunks = partsRaw.split(/^### /m);
  const intro = await Promise.all(paragraphs(chunks[0]).map(md));
  const parts: BrandPartFull[] = await Promise.all(
    chunks.slice(1).map(async (c) => {
      const nl = c.indexOf('\n');
      const title = c.slice(0, nl).trim();
      const ps = paragraphs(c.slice(nl + 1));
      const iContact = ps.findIndex((p, i) => i > 0 && /^Contact /.test(p));
      const contact = iContact > 0 ? await md(ps[iContact]) : undefined;
      const rest = ps.filter((_, i) => i !== iContact);
      return { title, id: slug(title), key: partKey(title), paras: await Promise.all(rest.map(md)), contact };
    }),
  );

  // repair lists: "Our software repairs include:" / "Our hardware repairs include:" + "– " lines
  const lists: BrandList[] = await Promise.all(
    listsRaw
      .split(/^(?=Our .+ include:\s*$)/m)
      .filter((b) => b.trim())
      .map(async (b) => {
        const nl = b.indexOf('\n');
        const label = (nl < 0 ? b : b.slice(0, nl)).trim();
        const rest = nl < 0 ? '' : b.slice(nl + 1);
        const lines = rest.split('\n').map((l) => l.trim());
        const items = lines.filter((l) => /^[–-]\s+/.test(l)).map((l) => l.replace(/^[–-]\s+/, '').trim());
        const other = paragraphs(
          rest
            .split('\n')
            .filter((l) => !/^\s*[–-]\s+/.test(l))
            .join('\n'),
        );
        const kind = /software/i.test(label) ? 'software' : /hardware/i.test(label) ? 'hardware' : 'other';
        return { label, kind, items: await Promise.all(items.map(inline)), extra: await Promise.all(other.map(md)) } as BrandList;
      }),
  );

  // areas we serve: "## AREAS WE SERVE:" + "###" groups of suburb links
  const areasTitle = areasRaw.match(/^## (.+)$/m)?.[1].trim() ?? '';
  const areas = areasRaw
    .split(/^### /m)
    .slice(1)
    .map((c) => {
      const nl = c.indexOf('\n');
      const title = c.slice(0, nl).trim();
      return {
        title,
        id: slug(title),
        links: [...c.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => ({ href: m[1], name: m[2] })),
      };
    });

  return { intro, parts, lists, areasTitle, areasId: slug(areasTitle), areas };
}
