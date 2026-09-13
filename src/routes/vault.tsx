import { createFileRoute } from "@tanstack/react-router";
import { VaultView } from "@/components/heirloom/vault-view";

export const Route = createFileRoute("/vault")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your trust · Heirloom" },
      {
        name: "description",
        content:
          "A demo trust in detail: portfolio, release schedule, check-ins, and a personal letter.",
      },
      { property: "og:title", content: "Your trust · Heirloom" },
      {
        property: "og:description",
        content: "A demo trust in detail: portfolio, schedule, and letter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  return (
    <main id="main" className="product-page">
      <VaultView />
    </main>
  );
}
