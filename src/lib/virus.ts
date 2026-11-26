// Splits the exported Virus and Spyware Removal page (src/content/pages/virus-and-spyware-removal.md).
// /virus-spyware-malware-removal-north-lakes/ has the same "##" sections, so this can serve it later.
// Every word comes from the exported file - nothing is retyped.
//
// WordPress structure:
//   # H1 (shown in the hero)  + one image (not downloaded yet, see CLAUDE.md)
//   4 intro paragraphs
//   ## Key Takeaways             - a "- " list of 4
//   ## Understanding Cyber Threats, ## Choosing the Right Antivirus, ## Daily Security Practices,
//   ## Recognizing Infection Symptoms, ## Comprehensive Removal Process   - paragraphs
//   ## Maintaining Ongoing Protection - lead paragraph, a "- " list of 7, closing paragraph.
//        WordPress flattened a nested list: item 1 is a sentence, then "Regular software updates" with
//        2 benefits and "Daily system scans" with 2 benefits. We show those as 1 + 2 groups.
//   ## Frequently Asked Questions - "###" questions with answers; the last answer is followed by a
//        numbered list "1. **Question?** Answer" (28 items, the last one is cut off on WordPress too).
import { md } from './home';

// ---------------------------------------------------------------- hero
// The WordPress H1 is one long sentence:
//   "Virus Removal North Lakes – We can Make sure you don’t have any Nasty Malware, ..."
// We show it as a big title + a smaller line, both inside the same <h1> (same words, same order).
export function splitHeading(heading: string) {
  const m = heading.match(/^(.+?)\s+([–—-])\s+(.+)$/);
  return m ? { title: m[1], dash: m[2], rest: m[3] } : { title: heading, dash: '', rest: '' };
}

// Short hero facts, quoted word for word from the page text (a fact is dropped if the text changes)
const HERO_FACTS = ['comprehensive removal services', 'prevent future attacks', 'around $99 per hour of service'];

export function heroFacts(body: string) {
  const text = body.replace(/\s+/g, ' ');
  return HERO_FACTS.filter((f) => text.includes(f));
}

// ---------------------------------------------------------------- body
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^!\[[^\]]*\]\([^)]*\)$/.test(p) && !/^# /.test(p));

const listItems = (s: string) =>
  s
    .split('\n')
    .filter((l) => /^-\s+/.test(l))
    .map((l) => l.replace(/^-\s+/, '').trim());

const htmlAll = (ps: string[]) => Promise.all(ps.map((p) => md(p)));

export interface VirusSection {
  title: string;
  id: string;
  paras: string[]; // HTML, one per paragraph
}

export async function virusSections(body: string) {
  const chunks = body.split(/^## /m);
  const introRaw = chunks[0];
  const sections = new Map<string, { title: string; raw: string }>();
  const order: string[] = [];
  for (const c of chunks.slice(1)) {
    const nl = c.indexOf('\n');
    const title = c.slice(0, nl).trim();
    const key = title.toLowerCase();
    sections.set(key, { title, raw: c.slice(nl + 1).trim() });
    order.push(key);
  }
  const find = (re: RegExp) => {
    const key = order.find((k) => re.test(k));
    return key ? sections.get(key)! : undefined;
  };
  const used = new Set<string>();
  const take = (re: RegExp) => {
    const s = find(re);
    if (s) used.add(s.title.toLowerCase());
    return s;
  };
  const textSection = async (re: RegExp): Promise<VirusSection | undefined> => {
    const s = take(re);
    return s ? { title: s.title, id: slugify(s.title), paras: await htmlAll(paragraphs(s.raw)) } : undefined;
  };

  // Key Takeaways
  const kt = take(/^key takeaways/);
  const takeaways = kt ? { title: kt.title, id: slugify(kt.title), items: await htmlAll(listItems(kt.raw)) } : undefined;

  const cyber = await textSection(/^understanding cyber threats/);
  const antivirus = await textSection(/^choosing the right antivirus/);
  const daily = await textSection(/^daily security practices/);
  const symptoms = await textSection(/^recognizing infection symptoms/);
  const removal = await textSection(/^comprehensive removal process/);

  // Maintaining Ongoing Protection
  const mp = take(/^maintaining ongoing protection/);
  let protection:
    | { title: string; id: string; leadHtml: string; outroHtml: string; first: string; groups: { name: string; items: string[] }[]; flat: string[] }
    | undefined;
  if (mp) {
    // lead = text before the list, outro = text after its last item
    const lines = mp.raw.split('\n');
    const firstLi = lines.findIndex((l) => /^-\s+/.test(l));
    let lastLi = -1;
    lines.forEach((l, i) => {
      if (/^-\s+/.test(l)) lastLi = i;
    });
    const items = listItems(mp.raw);
    const leadRaw = firstLi < 0 ? mp.raw : lines.slice(0, firstLi).join('\n');
    const outroRaw = firstLi < 0 ? '' : lines.slice(lastLi + 1).join('\n');
    const itemsHtml = await Promise.all(items.map(async (i) => (await md(i)).replace(/^<p>|<\/p>\s*$/g, '')));
    // 7 items = 1 sentence + 2 groups of (name + 2 benefits); otherwise show them as one flat list
    const grouped = items.length === 7;
    protection = {
      title: mp.title,
      id: slugify(mp.title),
      leadHtml: await md(leadRaw),
      outroHtml: await md(outroRaw),
      first: grouped ? itemsHtml[0] : '',
      groups: grouped
        ? [
            { name: itemsHtml[1], items: itemsHtml.slice(2, 4) },
            { name: itemsHtml[4], items: itemsHtml.slice(5, 7) },
          ]
        : [],
      flat: grouped ? [] : itemsHtml,
    };
  }

  // FAQ
  const fq = take(/^frequently asked questions/);
  let faq: { title: string; id: string; main: { q: string; id: string; html: string }[]; more: { n: number; q: string; html: string }[] } | undefined;
  if (fq) {
    const iNum = fq.raw.search(/^1\.\s+/m);
    const mainRaw = iNum < 0 ? fq.raw : fq.raw.slice(0, iNum);
    const numRaw = iNum < 0 ? '' : fq.raw.slice(iNum);
    const main = await Promise.all(
      mainRaw
        .split(/^### /m)
        .slice(1)
        .map(async (c) => {
          const nl = c.indexOf('\n');
          const q = c.slice(0, nl).trim();
          return { q, id: slugify(q), html: await md(c.slice(nl + 1)) };
        }),
    );
    const more = await Promise.all(
      [...numRaw.matchAll(/^(\d+)\.\s+\*\*(.+?)\*\*\s*([\s\S]*?)(?=^\d+\.\s+\*\*|(?![\s\S]))/gm)].map(async (m) => ({
        n: Number(m[1]),
        q: m[2].trim(),
        html: await md(m[3].trim()),
      })),
    );
    faq = { title: fq.title, id: slugify(fq.title), main, more };
  }

  // Any "##" section this layout doesn't know about is still shown (never drop content)
  const extra = await Promise.all(
    order
      .filter((k) => !used.has(k))
      .map(async (k) => {
        const s = sections.get(k)!;
        return { title: s.title, id: slugify(s.title), html: await md(s.raw) };
      }),
  );

  return {
    intro: await htmlAll(paragraphs(introRaw)),
    takeaways,
    cyber,
    antivirus,
    daily,
    symptoms,
    removal,
    protection,
    faq,
    extra,
  };
}
