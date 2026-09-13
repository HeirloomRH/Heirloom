import { createFileRoute } from "@tanstack/react-router";
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
  return (
    <main id="main">
      <Docs />
    </main>
  );
}
