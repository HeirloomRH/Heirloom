import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/heirloom/dashboard";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your workspace · Heirloom" },
      {
        name: "description",
        content:
          "Your family workspace: demo trusts, upcoming milestones, and the people at the heart of each one.",
      },
      { property: "og:title", content: "Your workspace · Heirloom" },
      {
        property: "og:description",
        content: "Your family workspace: demo trusts and milestones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <main id="main" className="product-page">
      <Dashboard />
    </main>
  );
}
