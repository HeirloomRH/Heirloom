import { createFileRoute } from "@tanstack/react-router";
import RoadmapPage from "@/components/heirloom/roadmap-page";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "The long view · Heirloom" },
      {
        name: "description",
        content:
          "The Heirloom roadmap: from a first vault to a lasting, multi-generation legacy.",
      },
      { property: "og:title", content: "The long view · Heirloom" },
      {
        property: "og:description",
        content: "The Heirloom roadmap: from a first vault to a lasting legacy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapPage,
});
