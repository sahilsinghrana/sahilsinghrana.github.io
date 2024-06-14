import { z, defineCollection } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
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
  type: "content",
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

export const collections = {
  blog: blogCollection,
  snippets: snippetsCollection,
};
