import { createFileRoute } from "@tanstack/react-router";
import { usePageMeta } from "@/lib/i18n/use-page-meta";
import { Builder } from "@/components/heirloom/builder";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a trust · Heirloom" },
      {
        name: "description",
        content:
          "Build a demo trust: portfolio, beneficiary, terms, and a personal letter. Saved locally in your browser — no funds are deposited.",
      },
      { property: "og:title", content: "Create a trust · Heirloom" },
      {
        property: "og:description",
        content:
          "Build a demo trust: portfolio, beneficiary, terms, and a personal letter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  usePageMeta("create");
  return (
    <main id="main" className="product-page">
      <Builder />
    </main>
  );
}
