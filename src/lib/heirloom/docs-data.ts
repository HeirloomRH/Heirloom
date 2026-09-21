/**
 * Structure for the handbook. Article copy lives in the locale dictionaries
 * (see each locale's `docs` namespace); only the reading order and the external
 * source URLs — neither of which is translated — stay here.
 */
export const articleIds = [
  "preview",
  "vaults",
  "portfolio",
  "schedules",
  "heartbeat",
  "guardians",
  "modes",
  "letters",
  "network",
  "boundaries",
  "token",
] as const;

export type ArticleId = (typeof articleIds)[number];

export const articleSources: Partial<Record<ArticleId, string>> = {
  portfolio: "https://docs.robinhood.com/chain/stock-tokens/",
  network: "https://docs.robinhood.com/chain/connecting/",
};

/** Sidebar grouping. Group labels are translated; the ids are not. */
export const articleGroups = [
  { key: "gettingStarted", ids: ["preview", "vaults"] },
  {
    key: "buildYourPlan",
    ids: ["portfolio", "schedules", "heartbeat", "guardians", "modes", "letters"],
  },
  { key: "protocol", ids: ["network", "boundaries", "token"] },
] as const satisfies ReadonlyArray<{
  key: "gettingStarted" | "buildYourPlan" | "protocol";
  ids: readonly ArticleId[];
}>;
