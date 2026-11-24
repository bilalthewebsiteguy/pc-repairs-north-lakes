// Splits the exported About page (src/content/pages/about-us.md) into parts so each part can be
// designed on its own. Every word comes from the exported file - nothing is retyped.
//
// WordPress structure ("##" headings stay <h2>):
//   ## About Us
//   ## **PC Repairs North Lakes**   intro paragraph (links to /areas-we-serve/) + list of the team
//   ## **Email**                     mailto link
//   ## **Phone**                     tel link, followed by the contact-form shortcode [fluentform id="1"]
// The form shortcode did not export (the form itself lives in WordPress), so it is NOT shown.
import { md } from './home';

export interface TeamMember {
  name: string; // as written in WordPress
  href?: string; // link, when WordPress had one (Robert -> /robert-krajnyk/)
  initials: string;
}

const strip = (s: string) => s.replace(/\*+/g, '').trim();
const inline = async (s: string) => (await md(s)).replace(/^<p>|<\/p>\s*$/g, '').trim();
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/ /g, '-');

export async function aboutSections(body: string) {
  // "## Title" -> { title, content }
  const sections = body
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      const title = strip(nl < 0 ? chunk : chunk.slice(0, nl));
      return { title, id: slug(title), content: nl < 0 ? '' : chunk.slice(nl + 1).trim() };
    });
  const find = (re: RegExp) => sections.find((s) => re.test(s.title));

  const aboutUs = find(/^about/i);
  const brand = find(/repairs/i);
  const email = find(/^email/i);
  const phone = find(/^phone/i);

  // Brand section: intro paragraph(s) + "- " list of the team
  const lines = (brand?.content ?? '').split('\n');
  const team: TeamMember[] = lines
    .filter((l) => /^-\s+/.test(l))
    .map((l) => {
      const item = l.replace(/^-\s+/, '').trim();
      const link = item.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const name = link ? link[1] : item;
      const initials = name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return { name, href: link?.[2], initials };
    });
  const introHtml = await md(lines.filter((l) => !/^-\s+/.test(l)).join('\n'));

  // Email / phone: the link inside each section (shortcode removed)
  const contact = async (s?: { title: string; id: string; content: string }) => {
    if (!s) return undefined;
    const clean = s.content.replace(/\\?\[fluentform[^\]]*\\?\]/gi, '').trim();
    const link = clean.match(/\[\**([^\]*]+)\**\]\(([^)]+)\)/);
    return { title: s.title, id: s.id, text: link?.[1].trim() ?? strip(clean), href: link?.[2], html: await inline(clean) };
  };

  return {
    aboutUs, // { title: "About Us", ... }
    brand: brand ? { title: brand.title, id: brand.id } : undefined, // "PC Repairs North Lakes"
    introHtml,
    introText: lines.filter((l) => !/^-\s+/.test(l)).join(' '),
    team,
    email: await contact(email),
    phone: await contact(phone),
    hasForm: /fluentform/i.test(body), // the WordPress contact form (not exported) - ask Bilal what replaces it
  };
}
