// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import remarkLiftH1 from './src/lib/remark-lift-h1.mjs';

export default defineConfig({
  site: 'https://www.pcrepairsnorthlakes.com.au',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    // Moves a page's own H1 into the hero so each page keeps exactly one H1 (same text)
    remarkPlugins: [remarkLiftH1],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});