// Splits the exported Mac Repair Services page (src/content/pages/mac-repair-services.md) into parts
// so each part can be designed on its own. Every word comes from the exported file - nothing is
// retyped, so the page text stays the same as WordPress.
//
// WordPress structure (heading levels are kept: "###" -> <h3>, "####" -> <h4>):
//   intro paragraph
//   ### iOS Installation & Update  (list of Mac OS versions)
//   #### Clean Mac / #### Upgrade Storage
//   ### We Repair All MAC Models:   (list of models)
//   #### Upgrade Memory / #### Data Recovery / #### Broken or Faulty LCD
//   ### Other Services             (list)
//   #### About Mac                  (paragraphs)
//   ## AREAS WE SERVE
import { md } from './home';

export interface MacBlock {
  id: string; // same id Astro gives the heading ("iOS Installation & Update" -> "ios-installation--update")
  title: string; // heading text, exactly as WordPress
  level: 3 | 4; // WordPress heading level
  items: string[]; // list items (HTML), when the block is a list
  html: string; // paragraphs (HTML), when the block is text
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/ /g, '-');

const inline = async (s: string) => (await md(s)).replace(/^<p>|<\/p>\s*$/g, '');

export async function macSections(body: string) {
  const [main, areasPart = ''] = body.split(/^## AREAS WE SERVE:?\s*$/m);

  // Split on "### " and "#### " headings, keeping the level
  const parts = main.split(/^(#{3,4}) (.+)$/m);
  const introHtml = await md(parts[0].trim());

  const blocks: MacBlock[] = [];
  for (let i = 1; i < parts.length; i += 3) {
    const level = parts[i].length as 3 | 4;
    const title = parts[i + 1].trim();
    const content = (parts[i + 2] ?? '').trim();
    const listLines = content.split('\n').filter((l) => /^-\s+/.test(l));
    const isList = listLines.length > 0 && listLines.length === content.split('\n').filter((l) => l.trim()).length;
    blocks.push({
      id: slug(title),
      title,
      level,
      items: isList ? await Promise.all(listLines.map((l) => inline(l.replace(/^-\s+/, '')))) : [],
      html: isList ? '' : await md(content),
    });
  }

  // Areas we serve: "### Group" + table of suburb links
  const areasTitle = (body.match(/^## (AREAS WE SERVE:?)\s*$/m) ?? [])[1] ?? 'AREAS WE SERVE';
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

  const find = (re: RegExp) => blocks.find((b) => re.test(b.title));
  return {
    introHtml,
    blocks, // every block, in page order
    versions: find(/installation/i), // list of Mac OS versions
    models: find(/models/i), // list of Mac models
    others: find(/^other services/i), // list of other services
    services: blocks.filter((b) => b.level === 4 && !/^about/i.test(b.title)), // Clean Mac, Upgrade Storage, ...
    about: find(/^about mac/i),
    allText: main, // raw page text, used to check that hero quotes are really on the page
    areasTitle,
    areas,
  };
}
