import { createFileRoute } from "@tanstack/react-router";
import { usePageMeta } from "@/lib/i18n/use-page-meta";
import { Docs } from "@/components/heirloom/docs";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation · Heirloom" },
      {
        name: "description",
        content:
          "The Heirloom handbook: how vaults work, portfolios, schedules, heartbeats, guardians, and boundaries.",
      },
      { property: "og:title", content: "Documentation · Heirloom" },
      {
        property: "og:description",
        content: "The Heirloom handbook: vaults, schedules, guardians, and boundaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  usePageMeta("docs");
  return (
    <main id="main">
      <Docs />
    </main>
  );
}
