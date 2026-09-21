import { useEffect } from "react";

import { useT, type Dict } from "./index";

type PageKey = keyof Dict["meta"];

/**
 * Keeps the document title and meta description in step with the active
 * locale. The route's own `head` config still supplies the English values for
 * SSR and crawlers; this only updates the live document after hydration, which
 * is what a reader who switches to 中文 actually sees in their tab.
 */
export function usePageMeta(page: PageKey): void {
  const t = useT();
  const { title, description } = t.meta[page];

  useEffect(() => {
    document.title = title;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute("content", description);
  }, [title, description]);
}
