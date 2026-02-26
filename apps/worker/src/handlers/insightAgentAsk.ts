import { pool } from "../db/pool";
import { JobContext } from "../types";

/**
 * INSIGHT_AGENT_ASK
 * payload: { question: string, viewId: string | null, filters: unknown[] }
 *
 * Steps:
 *  1. Fetch relevant topic + smart-column aggregates for the project    (20%)
 *  2. [stub] Call LLM with system context + aggregated data + question  (70%)
 *  3. Persist the answer and return it as resultRef                     (100%)
 *
 * In production the "call LLM" step uses Anthropic Messages API with a
 * tool-use chain: the agent queries the DB for specific metrics, then
 * synthesises a grounded answer with citations.
 */
export async function handleInsightAgentAsk(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { question, viewId, filters } = job.payload as {
    question: string;
    viewId: string | null;
    filters: unknown[];
  };

  // ── 1. Gather context ─────────────────────────────────────────────────────
  await setProgress(10);

  // Top 5 topics by assignment count
  const topicsRes = await pool.query(
    `SELECT t.name, COUNT(ta.id) AS count
     FROM topic_assignments ta
     JOIN topics t ON t.id = ta.topic_id
     JOIN dataset_rows dr ON dr.id = ta.row_id
     WHERE dr.project_id = $1
     GROUP BY t.name
     ORDER BY count DESC
     LIMIT 5`,
    [job.projectId]
  );
  const topTopics = topicsRes.rows;

  await setProgress(30);

  // Row count
  const rowCountRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM dataset_rows WHERE project_id = $1`,
    [job.projectId]
  );
  const totalRows: number = rowCountRes.rows[0]?.total ?? 0;

  await setProgress(50);

  // ── 2. [STUB] LLM answer ──────────────────────────────────────────────────
  // In production: build a Messages API request with:
  //   - system: analyst persona + schema description
  //   - user:   question + top_topics + totalRows + filters context
  //   - tools:  run_sql (to answer follow-up metric queries)
  await setProgress(70);

  const stubAnswer =
    `Based on ${totalRows} responses, the top themes are: ` +
    topTopics.map((t: { name: string; count: string }) => `${t.name} (${t.count})`).join(", ") +
    `. Regarding your question "${question}" — detailed AI analysis will be available once the LLM integration is wired in.`;

  const result = {
    question,
    answer: stubAnswer,
    context: { totalRows, topTopics, viewId, filters },
    generatedAt: new Date().toISOString(),
  };

  console.log(`[insight_agent_ask] project=${job.projectId} question="${question.slice(0, 60)}..."`);

  return JSON.stringify(result);
}
