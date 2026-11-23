// Splits the exported Computer Repairs North Lakes page (src/content/pages/computer-repairs-north-lakes.md)
// into parts so each part can be designed on its own. Every word comes from the exported file -
// nothing is retyped, so the page text stays the same as WordPress.
import { md } from './home';

const strip = (html: string) => html.replace(/^<p>|<\/p>\s*$/g, '');
const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** "## Title" sections inside a block of markdown */
async function headed(block: string) {
  return Promise.all(
    block
      .split(/^## /m)
      .slice(1)
      .map(async (c) => {
        const nl = c.indexOf('\n');
        return { title: c.slice(0, nl).trim(), html: await md(c.slice(nl + 1).trim()) };
      }),
  );
}

export async function northLakesSections(body: string) {
  const CALL = 'CALL US 07 3144 6766';
  const iServices = body.indexOf('OUR SERVICES');
  const iWhy = body.indexOf('WHY CHOOSE PC REPAIRS NORTHLAKES?');
  const iHardware = body.indexOf('### LAPTOP HARDWARE');
  const iAreas = body.indexOf('AREAS WE SERVE');

  // ---- Part A: intro + the list of popular services (+ FAQ answers glued to the last item)
  const partA = body.slice(0, body.indexOf(CALL)).trim();
  const firstItem = partA.indexOf('**![');
  const introRaw = partA.slice(0, firstItem).trim();

  // "Computer Services and Mobile Computer Technicians North Lakes, QLD, 4509Lots of us..."
  const tagMatch = introRaw.match(/^(.*?\d{4})(?=[A-Z])/);
  const tagline = tagMatch?.[1].trim() ?? '';
  let introText = introRaw.slice(tagline.length);
  // "...inquiries!We can help solve your computer problems in North Lakes – These are our most popular services"
  const leadMatch = introText.match(/We can help solve[^*]*$/);
  const servicesLead = leadMatch?.[0].trim() ?? '';
  if (leadMatch) introText = introText.slice(0, leadMatch.index).trim();
  const introHtml = await md(introText);

  const itemRe = /\*\*!\[[^\]]*\]\(([^)]+)\)\s*\[([^\]]+)\]\(([^)]+)\)\*\*:\s*([\s\S]*?)(?=\s*\*\*!\[|$)/g;
  const rawItems = [...partA.slice(firstItem).matchAll(itemRe)].map((m) => ({ name: m[2].trim(), href: m[3].trim(), desc: m[4].trim() }));

  // The last item's text runs straight into the FAQ answers ("...wellbeing.Our PC Repair services...")
  let faqRaw: string[] = [];
  const last = rawItems[rawItems.length - 1];
  if (last) {
    const parts = last.desc.split(/(?<=[.!?])(?=[A-Z][a-z])/);
    last.desc = parts[0];
    faqRaw = parts.slice(1);
  }
  const services = await Promise.all(rawItems.map(async (s) => ({ ...s, html: strip(await md(s.desc)) })));
  const faq = await Promise.all(faqRaw.map((a) => md(a.trim())));

  // ---- Part B: OUR SERVICES (## sections)
  const ourServices = await headed(body.slice(iServices + 'OUR SERVICES'.length, iWhy));

  // ---- Part C: WHY CHOOSE (## sections)
  const whyChoose = await headed(body.slice(iWhy + 'WHY CHOOSE PC REPAIRS NORTHLAKES?'.length, body.indexOf(CALL, iWhy)));

  // ---- Part D: hardware callout
  const hw = body.slice(iHardware, iAreas);
  const hwLines = hw.split('\n');
  const hardware = {
    title: hwLines[0].replace(/^###\s*/, '').trim(),
    problems: paragraphs(hw)[1]
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? [],
    quote: hw.match(/\[([^\]]+)\]\(([^)]+)\)/),
    note: paragraphs(hw).at(-1) ?? '',
  };

  // ---- Part E: areas we serve
  const areas = body
    .slice(iAreas)
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
    tagline,
    introHtml,
    servicesLead,
    services,
    call: CALL,
    ourServicesTitle: 'OUR SERVICES',
    ourServices,
    whyTitle: 'WHY CHOOSE PC REPAIRS NORTHLAKES?',
    whyChoose,
    hardware: { ...hardware, quoteLabel: hardware.quote?.[1] ?? '', quoteHref: hardware.quote?.[2] ?? '' },
    areasTitle: 'AREAS WE SERVE',
    areas,
    faq,
  };
}
