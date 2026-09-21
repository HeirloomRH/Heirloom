/**
 * Structural parity check for the locale dictionaries.
 *
 * TypeScript already enforces this at build time (each zh namespace is typed
 * against its en counterpart), but this runs without node_modules and reports
 * every mismatch at once instead of stopping at the first type error.
 *
 *   bun scripts/check-i18n.ts
 */
import { en } from "../src/lib/i18n/en";
import { zh } from "../src/lib/i18n/zh";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const problems: string[] = [];

function kind(v: unknown): string {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

function walk(a: Json, b: Json, path: string): void {
  if (kind(a) !== kind(b)) {
    problems.push(`${path}: en is ${kind(a)}, zh is ${kind(b)}`);
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      problems.push(`${path}: en has ${a.length} items, zh has ${b.length}`);
      return;
    }
    a.forEach((item, i) => walk(item, (b as Json[])[i], `${path}[${i}]`));
    return;
  }

  if (kind(a) === "object") {
    const ao = a as Record<string, Json>;
    const bo = b as Record<string, Json>;
    for (const k of Object.keys(ao)) {
      if (!(k in bo)) {
        problems.push(`${path}.${k}: missing from zh`);
        continue;
      }
      walk(ao[k], bo[k], `${path}.${k}`);
    }
    for (const k of Object.keys(bo)) {
      if (!(k in ao)) problems.push(`${path}.${k}: present in zh but not en`);
    }
    return;
  }

  if (typeof a === "string" && typeof b === "string") {
    // A deliberately blank slot is fine as long as both locales agree on it
    // (e.g. an article with no external source). A one-sided blank is a bug.
    const aEmpty = a.trim() === "";
    const bEmpty = b.trim() === "";
    if (aEmpty !== bEmpty) {
      problems.push(
        `${path}: ${aEmpty ? "en" : "zh"} is empty but ${aEmpty ? "zh" : "en"} is not`,
      );
    }
  }
}

function countStrings(v: Json): number {
  if (typeof v === "string") return 1;
  if (Array.isArray(v)) return v.reduce<number>((n, x) => n + countStrings(x), 0);
  if (v && typeof v === "object")
    return Object.values(v).reduce<number>((n, x) => n + countStrings(x), 0);
  return 0;
}

walk(en as unknown as Json, zh as unknown as Json, "root");

// Spot-check that the interpolating entries actually run, and that a sample of
// keys really differs between locales (a copy-paste of the English dictionary
// would otherwise pass the structural check above).
const samples: [string, string, string][] = [
  ["common.nav.docs", en.common.nav.docs, zh.common.nav.docs],
  ["home.hero.lines[0]", en.home.hero.lines[0], zh.home.hero.lines[0]],
  ["vault.tabs.schedule", en.vault.tabs.schedule, zh.vault.tabs.schedule],
  ["meta.home.title", en.meta.home.title, zh.meta.home.title],
  [
    "vault.schedule.inDays(5)",
    en.vault.schedule.inDays(5),
    zh.vault.schedule.inDays(5),
  ],
  [
    "builder.step2.heartbeatEvery(90)",
    en.builder.step2.heartbeatEvery(90),
    zh.builder.step2.heartbeatEvery(90),
  ],
  [
    "docs.ui.articlesFound(3)",
    en.docs.ui.articlesFound(3),
    zh.docs.ui.articlesFound(3),
  ],
];
for (const [label, e, z] of samples) {
  if (e === z) problems.push(`${label}: en and zh are the same string ("${e}")`);
}

const total = countStrings(en as unknown as Json);
const namespaces = Object.keys(en).join(", ");

if (problems.length > 0) {
  console.error(`✗ ${problems.length} i18n mismatch(es):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`✓ en/zh dictionaries match — ${total} strings across: ${namespaces}`);
