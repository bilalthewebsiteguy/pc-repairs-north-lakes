// Splits the exported Laptop Repair page (src/content/pages/laptop-repair.md) into parts so each
// part can be designed on its own. Every word comes from the exported file - nothing is retyped,
// so the page text stays the same as WordPress.
import { md } from './home';

export interface RepairSection {
  id: string; // anchor used by the WordPress "jump to" links (#screenrepair, #harddrive, ...)
  label: string; // the WordPress jump-link text, e.g. "Hard Drive Repair"
  title?: string; // the section heading, when WordPress had one
  leadHtml: string; // text before a "(1) ... (2) ..." list, or the whole first paragraph
  signs: string[]; // the "(1) ... (2) ..." items, shown as a list
  restHtml: string; // the remaining paragraphs
}

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// "These problems may include: (1) A, (2) B, and (3) C." -> lead + [A, B, C]
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

export async function laptopSections(body: string) {
  const [main, areasPart = ''] = body.split(/^## AREAS WE SERVE\s*$/m);

  // Intro + "jump to" list come before the first "# " heading
  const chunks = main.split(/^# /m);
  const introChunk = chunks[0];
  const toc = [...introChunk.matchAll(/^-\s+\[([^\]]+)\]\(#([^)]+)\)/gm)].map((m) => ({ label: m[1], id: m[2] }));
  const introParas = paragraphs(introChunk.replace(/^-\s+\[[^\]]+\]\(#[^)]+\)\s*$/gm, ''));

  // Headed sections. The last one (Tune Up) also holds the un-headed paragraphs that WordPress
  // showed for the remaining jump links (New Laptop Setup, Virus Removal, ...), one each.
  const headed = chunks.slice(1).map((c) => {
    const nl = c.indexOf('\n');
    return { title: c.slice(0, nl).trim(), paras: paragraphs(c.slice(nl + 1)) };
  });
  const extraCount = Math.max(0, toc.length - headed.length);
  const last = headed[headed.length - 1];
  const extras = last && extraCount ? last.paras.splice(last.paras.length - extraCount, extraCount) : [];

  const build = async (id: string, label: string, title: string | undefined, paras: string[]): Promise<RepairSection> => {
    const [first = '', ...rest] = paras;
    const split = splitSigns(first);
    return {
      id,
      label,
      title,
      leadHtml: split ? (split.lead ? await md(split.lead) : '') : await md(first),
      signs: split ? await Promise.all(split.signs.map(async (s) => (await md(s)).replace(/^<p>|<\/p>\s*$/g, ''))) : [],
      restHtml: rest.length ? await md(rest.join('\n\n')) : '',
    };
  };

  const repairs = await Promise.all(
    headed.map((h, i) => build(toc[i]?.id ?? `s${i}`, toc[i]?.label ?? h.title, h.title, h.paras)),
  );
  const more = await Promise.all(
    extras.map((p, i) => {
      const t = toc[headed.length + i];
      return build(t?.id ?? `x${i}`, t?.label ?? '', undefined, [p]);
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

  return { introHtml: await md(introParas.join('\n\n')), toc, repairs, more, areas };
}
