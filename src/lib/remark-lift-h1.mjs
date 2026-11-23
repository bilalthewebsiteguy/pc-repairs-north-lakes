// Remark plugin: gives every page exactly ONE H1 (shown in the hero) without losing any words.
//
// Hero H1 = the H1 the live WordPress page showed (`h1` in the exported frontmatter),
//           or the page title if the live page had none / used H1 for every section.
// In the page text:
//   - an H1 that just repeats the hero H1 is removed (it's shown in the hero instead)
//   - the homepage's H1 was split over two lines in WordPress ("# AFFORDABLE AND RELIABLE" +
//     "COMPUTER REPAIR SERVICES"); both parts are removed because the hero shows the full H1
//   - every other H1 becomes an H2 (same words, correct heading level)
// The result is exposed as `heroH1` for the templates (see src/lib/heading.ts).
const toText = (node) =>
  node.type === 'text' || node.type === 'inlineCode'
    ? node.value
    : node.type === 'break'
      ? ' '
      : (node.children ?? []).map(toText).join('');

const norm = (s = '') => String(s).replace(/\s+/g, ' ').trim();
const same = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();

export default function remarkLiftH1() {
  return (tree, file) => {
    file.data.astro ??= {};
    const fm = (file.data.astro.frontmatter ??= {});
    const h1Nodes = tree.children.filter((n) => n.type === 'heading' && n.depth === 1);
    const liveH1 = norm(fm.h1);
    const hero = h1Nodes.length > 1 ? norm(fm.title) : liveH1 || norm(fm.title);
    const remove = new Set();

    if (h1Nodes.length === 1) {
      const node = h1Nodes[0];
      const text = norm(toText(node));
      const index = tree.children.indexOf(node);
      const next = tree.children[index + 1];
      if (same(text, hero)) {
        remove.add(node);
      } else if (hero.toLowerCase().startsWith(text.toLowerCase()) && next?.type === 'paragraph') {
        const rest = hero.slice(text.length);
        if (same(toText(next), rest)) {
          remove.add(node);
          remove.add(next);
        }
      }
    }

    tree.children = tree.children.filter((n) => !remove.has(n));
    for (const n of tree.children) if (n.type === 'heading' && n.depth === 1) n.depth = 2;
    fm.heroH1 = hero;
  };
}
