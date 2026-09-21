import { createFileRoute } from "@tanstack/react-router";
import { usePageMeta } from "@/lib/i18n/use-page-meta";
import WhitepaperPage from "@/components/heirloom/whitepaper-page";

export const Route = createFileRoute("/whitepaper")({
  head: () => ({
    meta: [
      { title: "Technical Whitepaper · Heirloom Protocol" },
      {
        name: "description",
        content:
          "Heirloom Protocol Technical Whitepaper: Deterministic RWA custody, programmable estate succession, dead-man vitality verification, and 28-day grace periods on Robinhood Chain.",
      },
      { property: "og:title", content: "Technical Whitepaper · Heirloom Protocol" },
      {
        property: "og:description",
        content:
          "Heirloom Protocol Technical Whitepaper: Deterministic RWA custody, programmable estate succession, dead-man vitality verification, and 28-day grace periods on Robinhood Chain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhitepaperRoute,
});

function WhitepaperRoute() {
  usePageMeta("whitepaper");
  return <WhitepaperPage />;
}
