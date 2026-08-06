import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content lives here as YAML so copy edits never touch component code, and the
 * schemas below fail the build on a typo rather than shipping a blank section.
 *
 * Every string in these collections traces back to Downloads/AdnanResAug2026.pdf.
 * Nothing is embellished — in particular there is no team-size figure anywhere,
 * because the CV does not state one.
 *
 * The design archive is the one exception: it lives in src/data/archive.ts so it
 * can hold real ImageMetadata via import.meta.glob and get astro:assets
 * optimisation, which a YAML string path would not.
 */

const role = z.object({
  title: z.string(),
  period: z.string(),
  current: z.boolean().default(false),
  points: z.array(z.string()).min(1),
});

const experience = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/experience' }),
  schema: z.object({
    order: z.number(),
    company: z.string(),
    companyNote: z.string(),
    location: z.string(),
    current: z.boolean().default(false),
    /** Optional pull-quote rendered large alongside the role list. */
    headline: z.string().optional(),
    roles: z.array(role).min(1),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/tools' }),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    kind: z.string(),
    problem: z.string(),
    build: z.string(),
    effect: z.string(),
  }),
});

const credentials = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/credentials' }),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    issuer: z.string(),
    status: z.enum(['verified', 'ongoing']),
    /** Credly verification link. Absent for in-progress credentials. */
    url: z.string().url().optional(),
  }),
});

const earlier = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/earlier' }),
  schema: z.object({
    order: z.number(),
    company: z.string(),
    role: z.string(),
    period: z.string(),
    location: z.string(),
    summary: z.string(),
  }),
});

export const collections = { experience, tools, credentials, earlier };
