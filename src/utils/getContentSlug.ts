/** Public URL slug for blog/snippet entries (frontmatter slug wins over collection id). */
export function getContentSlug(entry: {
  id: string;
  data: { slug?: string };
}): string {
  return entry.data.slug || entry.id;
}

export function getBlogPostPath(entry: {
  id: string;
  data: { slug?: string };
}): string {
  return `/blog/posts/${getContentSlug(entry)}`;
}

export function getSnippetPath(entry: {
  id: string;
  data: { slug?: string };
}): string {
  return `/blog/snippets/${getContentSlug(entry)}`;
}
