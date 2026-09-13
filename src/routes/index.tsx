import { createFileRoute } from "@tanstack/react-router";
import Home from "@/components/heirloom/home-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heirloom — A future worth passing on." },
      {
        name: "description",
        content:
          "Build a portfolio. Write your wishes. Give the people you love a future to grow into. Explore the Heirloom programmable trust vault frontend.",
      },
      { property: "og:title", content: "Heirloom — A future worth passing on." },
      {
        property: "og:description",
        content:
          "Build a portfolio. Write your wishes. Give the people you love a future to grow into.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
