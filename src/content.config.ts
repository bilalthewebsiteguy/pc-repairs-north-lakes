// src/content.config.ts
// Defines the two content collections created by scripts/export-wp.mjs.
// Field names match the frontmatter the export script writes - don't rename them.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const wpFields = z.object({
  title: z.string(),
  slug: z.string(),
  path: z.string(), // the exact old WordPress URL path, e.g. "/computer-repairs-chermside/"
  seoTitle: z.string().optional(),
  description: z.string().optional(),
  canonical: z.string().optional(),
  robots: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  h1: z.string().optional(),
  template: z.string().optional(),
  parent: z.number().optional(),
  date: z.coerce.date().optional(),
  modified: z.coerce.date().optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  emptyContent: z.boolean().optional(),
  seoMissing: z.boolean().optional(),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: wpFields,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: wpFields,
});

export const collections = { pages, posts };
