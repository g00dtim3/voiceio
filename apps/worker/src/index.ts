import { pool } from "./db/pool";
import { registerHandler, startWorker } from "./queue";
import { handleTopicGeneration } from "./handlers/topicGeneration";
import { handleTopicRecompute } from "./handlers/topicRecompute";
import { handleSmartColumnPreview } from "./handlers/smartColumnPreview";
import { handleSmartColumnFill } from "./handlers/smartColumnFill";
import { handleInsightAgentAsk } from "./handlers/insightAgentAsk";

// ─── Register all handlers ────────────────────────────────────────────────────
registerHandler("topic_generation",    handleTopicGeneration);
registerHandler("topic_recompute",     handleTopicRecompute);
registerHandler("smart_column_preview", handleSmartColumnPreview);
registerHandler("smart_column_fill",   handleSmartColumnFill);
registerHandler("insight_agent_ask",   handleInsightAgentAsk);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
import { stopWorker } from "./queue";

process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received — draining...");
  stopWorker();
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] SIGINT received — shutting down");
  stopWorker();
  await pool.end();
  process.exit(0);
});

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await pool.query("SELECT 1");
  console.log("[worker] db connected");
  await startWorker();
})().catch((err) => {
  console.error("[worker] fatal startup error", err);
  process.exit(1);
});
