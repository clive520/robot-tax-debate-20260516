import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "supabase", "content-schema.sql");
const importPath = path.join(root, "migration", "import-content-seed.sql");
const outputPath = path.join(root, "migration", "apply-content-database.sql");

const [schemaSql, importSql] = await Promise.all([
  readFile(schemaPath, "utf8"),
  readFile(importPath, "utf8"),
]);

const output = `-- AI Debate Archive content database migration.
-- This combined file runs:
-- 1. supabase/content-schema.sql
-- 2. migration/import-content-seed.sql
--
-- It is intended for Supabase SQL Editor during the database migration phase.

${schemaSql.trim()}

-- ---------------------------------------------------------------------------
-- Seed import
-- ---------------------------------------------------------------------------

${importSql.trim()}
`;

await writeFile(outputPath, `${output}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)}`);
