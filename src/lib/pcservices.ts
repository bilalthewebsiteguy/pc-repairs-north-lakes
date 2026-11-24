// Splits the exported PC Services page (src/content/pages/pc-services-2.md) into parts so each
// part can be designed on its own. Every word comes from the exported file - nothing is retyped,
// so the page text stays the same as WordPress.
import { md } from './home';

export interface PcSection {
  id: string; // anchor made from the heading, e.g. "pc-health-check"
  title: string; // the WordPress "# " heading (shown as an H2; the page H1 is "PC Services")
  leadHtml: string; // text before a "(1) ... (2) ..." list, or the first paragraph
  signs: string[]; // the "(1) ... (2) ..." items, shown as a list
  restHtml: string; // the remaining paragraphs
}

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// Same ids Astro gives the headings ("Software Installation & Repair" -> "software-installation--repair")
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/ /g, '-');

const inline = async (s: string) => (await md(s)).replace(/^<p>|<\/p>\s*$/g, '');

// "These common hardware problems include: (1) A, (2) B, ... and (10) C." -> lead + [A, B, ..., C]
// The WordPress list skips number (6); the items are kept exactly as written.
function splitSigns(p: string) {
  const first = p.search(/\(1\)\s/);
  if (first < 0) return null;
  const lead = p.slice(0, first).trim();
  const signs = p
    .slice(first)
    .split(/\(\d+\)\s*/)
    .map((x) => x.trim().replace(/,?\s*(and)?$/, '').trim())
    .filter(Boolean);
  return signs.length >= 2 ? { lead, signs } : null;
}

export async function pcServicesSections(body: string) {
  const [main, areasPart = ''] = body.split(/^## AREAS WE SERVE\s*$/m);

  // Intro paragraphs come before the first "# " heading; each "# " starts a service section
  const chunks = main.split(/^# /m);
  const introParas = paragraphs(chunks[0]);

  const sections: PcSection[] = await Promise.all(
    chunks.slice(1).map(async (c) => {
      const nl = c.indexOf('\n');
      const title = c.slice(0, nl).trim();
      const paras = paragraphs(c.slice(nl + 1));
      // The "(1) ... (10)" list can be in any paragraph (Hardware has it in the second one)
      const signsAt = paras.findIndex((p) => splitSigns(p));
      const split = signsAt >= 0 ? splitSigns(paras[signsAt]) : null;
      const before = signsAt >= 0 ? paras.slice(0, signsAt) : paras.slice(0, 1);
      if (split?.lead) before.push(split.lead);
      const after = signsAt >= 0 ? paras.slice(signsAt + 1) : paras.slice(1);
      return {
        id: slug(title),
        title,
        leadHtml: await md(before.join('\n\n')),
        signs: split ? await Promise.all(split.signs.map(inline)) : [],
        restHtml: after.length ? await md(after.join('\n\n')) : '',
      };
    }),
  );

  // Areas we serve: "### Group" + table of suburb links
  const areas = areasPart
    .split(/^### /m)
    .slice(1)
    .map((c) => {
      const nl = c.indexOf('\n');
      return {
        title: c.slice(0, nl).trim(),
        links: [...c.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => ({ href: m[1], name: m[2] })),
      };
    });

  return {
    introHtml: await md(introParas.join('\n\n')),
    sections,
    allText: main, // raw page text, used to check that hero quotes are really on the page
    areas,
  };
}
