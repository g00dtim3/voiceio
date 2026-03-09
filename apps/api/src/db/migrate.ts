import { pool } from "./pool";
import { readFileSync } from "fs";
import { join } from "path";

async function migrate() {
  const sql = readFileSync(join(__dirname, "migrations", "001_initial_schema.sql"), "utf-8");
  await pool.query(sql);
  console.log("[migrate] schema applied");
  await pool.end();
}

migrate().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
