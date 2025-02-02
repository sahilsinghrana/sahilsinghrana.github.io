import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const blogCollection = defineCollection({
  // type: "content",
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      pubDate: z.date(),
      description: z.string(),
      image: z.object({
        url: image().or(z.string()),
        alt: z.string(),
      }),
      tags: z.array(z.string()),
      featured: z.optional(z.boolean()),
    }),
});

const snippetsCollection = defineCollection({
  // type: "content",
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/snippets",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      image: z.object({
        url: image().or(z.string()),
        alt: z.string(),
      }),
      tags: z.array(z.string()),
      featured: z.optional(z.boolean()),
    }),
});

const whyMoonCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.string(),
      image: z.object({
        url: image().or(z.string()),
        alt: z.string(),
      }),
      footnote: z.string().optional(),
      description: z.string().optional(),
    }),
});

export const collections = {
  blog: blogCollection,
  snippets: snippetsCollection,
  whyMoon: whyMoonCollection,
};
