import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const fileName of files) {
    const sqlFile = await readFile(path.join(migrationsDir, fileName), "utf8");
    const sql = sqlFile.replace(/^\uFEFF/, "");
    await pool.query(sql);
    console.log(`Applied migration: ${fileName}`);
  }

  console.log("Migration complete");
  process.exit(0);
};

run().catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
