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

const projectsCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      image: z.object({
        url: image().or(z.string()),
        alt: z.string(),
      }),
      links: z.array(
        z
          .object({
            Icon: z.function(),
            link: z.string(),
          })
          .optional(),
      ),
    }),
});

export const collections = {
  blog: blogCollection,
  snippets: snippetsCollection,
  whyMoon: whyMoonCollection,
  projects: projectsCollection,
};
