import { app } from "./app";
import { pool } from "./db/pool";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main(): Promise<void> {
  // Verify DB connectivity at startup
  await pool.query("SELECT 1");
  console.log("[db] connected");

  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[startup] fatal error", err);
  process.exit(1);
});
