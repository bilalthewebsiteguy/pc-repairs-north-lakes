// Splits the exported Other Services page (src/content/pages/other-services.md) into parts.
// Every word and link comes from the exported file - nothing is retyped.
//
// WordPress structure:
//   two intro paragraphs
//   a "- " list of 4 services (Mac Repair, Network Installation, Network Troubleshooting,
//     Internet Connection Troubleshooting)
//   the 4 descriptions, run together in a few paragraphs: WordPress glued each new service onto the
//     end of the previous one with no space ("...of your Mac.Not only do we need...").
//     We split at those joins, giving 8 pieces = 2 per service, in list order.
//   ## AREAS WE SERVE  -> ### region + <table> of suburb links (x2)
import { md } from './home';

export interface OtherService {
  name: string; // from the WordPress list
  id: string;
  html: string; // its description (2 paragraphs)
  reasons: string[]; // "(1) ... (2) ... (3) ..." turned into a real list, when the text has one
  introHtml?: string; // text before that list (only when reasons were found)
  outroHtml?: string; // text after it
}

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
    .filter(Boolean);

export async function otherServicesSections(body: string) {
  const iAreas = body.search(/^## /m);
  const main = iAreas < 0 ? body : body.slice(0, iAreas);
  const areasRaw = iAreas < 0 ? '' : body.slice(iAreas);

  // ---- intro (before the list), list, descriptions (after the list)
  const lines = main.split('\n');
  const firstLi = lines.findIndex((l) => /^-\s+/.test(l));
  let lastLi = firstLi;
  while (lastLi + 1 < lines.length && /^-\s+/.test(lines[lastLi + 1])) lastLi++;
  const introRaw = lines.slice(0, firstLi).join('\n');
  const names = lines.slice(firstLi, lastLi + 1).map((l) => l.replace(/^-\s+/, '').trim());
  const restRaw = lines.slice(lastLi + 1).join('\n');

  // Pieces: paragraphs, each split where WordPress glued two sentences with no space
  const pieces = paragraphs(restRaw).flatMap((p) => p.split(/(?<=[a-z][.!?])(?=[A-Z][a-z])/));
  const per = names.length > 0 && pieces.length % names.length === 0 ? pieces.length / names.length : 0;

  const services: OtherService[] = [];
  if (per > 0) {
    for (const [i, name] of names.entries()) {
      const own = pieces.slice(i * per, (i + 1) * per);
      const text = own.join('\n\n');
      // "(1) A, (2) B or (3) C." -> a real list (same words)
      const m = text.match(/^([\s\S]*?:)\s*\(1\)\s*([\s\S]*?),\s*\(2\)\s*([\s\S]*?)\s+or\s+\(3\)\s*([\s\S]*?\.)\s*([\s\S]*)$/);
      services.push({
        name,
        id: slugify(name),
        html: await md(text),
        reasons: m ? [m[2], m[3], m[4]].map((r) => r.trim()) : [],
        introHtml: m ? await md(m[1]) : undefined,
        outroHtml: m && m[5].trim() ? await md(m[5]) : undefined,
      });
    }
  }

  // ---- areas we serve
  const areasTitle = areasRaw.match(/^## (.+)$/m)?.[1].trim() ?? '';
  const areas = areasRaw
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
    introHtml: await md(introRaw),
    introText: introRaw.replace(/\s+/g, ' '),
    names,
    services, // empty if the text couldn't be split cleanly -> template shows `restHtml` instead
    restHtml: per > 0 ? '' : await md(restRaw),
    restText: restRaw.replace(/\s+/g, ' '),
    areasTitle,
    areasId: slugify(areasTitle),
    areas,
  };
}
