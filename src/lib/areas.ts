// Splits the exported Coverage Areas page (src/content/pages/areas-we-serve.md) into parts.
// Every word and link comes from the exported file - nothing is retyped.
//
// WordPress structure:
//   ## Areas We Serve
//   ### Moreton Bay Areas     <table> of suburb links
//   ### Northside Suburbs     <table> of suburb links
// Links keep their exact WordPress href (a few have no trailing slash; that's how WordPress had them).

export interface Suburb {
  name: string;
  href: string;
}
export interface Region {
  title: string;
  id: string;
  suburbs: Suburb[];
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&#x27;/g, "'").trim();

export function areasSections(body: string) {
  const titleMatch = body.match(/^## (.+)$/m);
  const regions: Region[] = body
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      const title = chunk.slice(0, nl).trim();
      return {
        title,
        id: slugify(title),
        suburbs: [...chunk.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => ({ href: m[1], name: decode(m[2]) })),
      };
    });

  return { title: titleMatch?.[1].trim() ?? '', titleId: slugify(titleMatch?.[1] ?? ''), regions };
}
