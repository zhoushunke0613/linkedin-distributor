#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "migrations");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(dbUrl);

await sql`
  CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const applied = new Set(
  (await sql`SELECT id FROM _migrations`).map((r) => r.id),
);

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`- ${file} (already applied)`);
    continue;
  }
  console.log(`+ ${file}`);
  const body = readFileSync(join(migrationsDir, file), "utf8");
  await sql.query(body);
  await sql`INSERT INTO _migrations (id) VALUES (${file})`;
}

console.log("migrations done");
