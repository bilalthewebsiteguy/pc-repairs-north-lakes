// Splits the exported homepage text (src/content/pages/index.md) into its sections so each one
// can be designed separately. All words come from the exported file - nothing is retyped here,
// so the homepage text stays the same as WordPress.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | undefined;
export async function md(source: string): Promise<string> {
  processor ??= await createMarkdownProcessor();
  return (await processor.render(source.trim())).code;
}

const sectionMap = (body: string) => {
  const map = new Map<string, string>();
  for (const chunk of body.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf('\n');
    map.set(chunk.slice(0, nl).trim(), chunk.slice(nl + 1).trim());
  }
  return map;
};

const find = (map: Map<string, string>, starts: string) =>
  [...map.entries()].find(([k]) => k.toLowerCase().startsWith(starts.toLowerCase()));

export async function homeSections(body: string) {
  const map = sectionMap(body);

  // OUR SERVICES -> one card per "### Title" (image + description)
  const servicesEntry = find(map, 'our services');
  const services = await Promise.all(
    (servicesEntry?.[1] ?? '')
      .split(/^### /m)
      .slice(1)
      .map(async (chunk) => {
        const nl = chunk.indexOf('\n');
        const title = chunk.slice(0, nl).trim();
        const rest = chunk.slice(nl + 1);
        const image = rest.match(/!\[[^\]]*\]\(([^)\s]+)\)/)?.[1];
        const text = rest.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
        return { title, image, html: await md(text) };
      }),
  );

  // Laptop Repairs North Lakes -> intro line + brand logo links from the table
  const laptopEntry = find(map, 'laptop repairs');
  const laptopBody = laptopEntry?.[1] ?? '';
  const laptopIntro = laptopBody.split('<table')[0].trim();
  const brands = [...laptopBody.matchAll(/<a href="([^"]+)"><img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/g)].map((m) => ({
    href: m[1],
    image: m[2],
    alt: m[3],
  }));

  // About -> text, quote, photo, caption
  const aboutEntry = find(map, 'about');
  const aboutBody = aboutEntry?.[1] ?? '';
  const aboutImage = aboutBody.match(/!\[[^\]]*\]\(([^)\s]+)\)/)?.[1];
  const aboutCaption = aboutBody.match(/^\*\*(.+?)\*\*\s*$/m)?.[1];
  const aboutQuote = aboutBody.match(/^_“?([\s\S]+?)”?_\s*$/m)?.[1];
  const aboutText = aboutBody
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\*\*.+?\*\*\s*$/m, '')
    .replace(/^_[\s\S]+?_\s*$/m, '')
    .trim();

  // FAQ -> the WordPress text has the answers run together with no questions
  // ("...repair.Absolutely; ..."). Split at those joins so each answer is its own block.
  const faqEntry = find(map, 'frequently asked');
  const faqAnswers = await Promise.all(
    (faqEntry?.[1] ?? '')
      .split(/(?<=[.!?])(?=[A-Z][a-z])/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => md(s)),
  );

  return {
    services: { title: servicesEntry?.[0] ?? 'OUR SERVICES', items: services },
    laptop: { title: laptopEntry?.[0] ?? '', introHtml: await md(laptopIntro), brands },
    about: {
      title: aboutEntry?.[0] ?? '',
      html: await md(aboutText),
      quote: aboutQuote?.trim(),
      image: aboutImage,
      caption: aboutCaption,
    },
    faq: { title: faqEntry?.[0] ?? '', answers: faqAnswers },
    testimonialsTitle: find(map, 'testimonials')?.[0] ?? 'Testimonials',
    articlesTitle: find(map, 'useful articles')?.[0] ?? 'Useful Articles',
  };
}
