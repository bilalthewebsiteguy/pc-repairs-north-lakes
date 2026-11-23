// The single H1 for a page, worked out by src/lib/remark-lift-h1.mjs from the WordPress page:
// the H1 the live page showed, or the page title if it had none.
export function pageHeading(data: { title: string; h1?: string }, remarkFrontmatter: Record<string, unknown> = {}) {
  const hero = typeof remarkFrontmatter.heroH1 === 'string' ? remarkFrontmatter.heroH1 : undefined;
  return (hero || data.h1 || data.title).replace(/\s+/g, ' ').trim();
}
