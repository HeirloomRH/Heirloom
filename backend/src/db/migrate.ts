import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./index.js";

export async function migrate(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[migrate] DATABASE_URL not set, skipping database migrations.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "../../db/migrations");
    
    let entries: string[] = [];
    try {
      entries = await fs.readdir(migrationsDir);
    } catch {
      console.warn(`[migrate] No migrations directory found at ${migrationsDir}`);
      return;
    }

    const sqlFiles = entries
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    const { rows: appliedRows } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );
    const appliedSet = new Set(appliedRows.map((r) => r.filename));

    for (const file of sqlFiles) {
      if (appliedSet.has(file)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, "utf-8");

      console.log(`[migrate] Applying migration: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migrate] Successfully applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`[migrate] Failed applying migration: ${file}`);
        throw error;
      }
    }
  } finally {
    client.release();
  }
}
