import OpenAI from "openai";
import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import { INSIGHT_AGENT_SYSTEM } from "../lib/prompts";
import { JobContext } from "../types";

/**
 * INSIGHT_AGENT_ASK
 * payload: { question: string, viewId: string | null, filters: unknown[] }
 *
 * Steps:
 *  1. Fetch relevant topic + smart-column aggregates for the project    (20%)
 *  2. Call gpt-4o with tool use (run_sql) to produce a grounded answer  (70%)
 *  3. Return the answer as resultRef                                    (100%)
 */
export async function handleInsightAgentAsk(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { question, viewId, filters } = job.payload as {
    question: string;
    viewId: string | null;
    filters: unknown[];
  };

  // ── 1. Gather initial context ─────────────────────────────────────────────
  await setProgress(10);

  const topicsRes = await pool.query(
    `SELECT t.label AS name, COUNT(ta.id)::int AS count
     FROM topic_assignments ta
     JOIN topics t ON t.id = ta.topic_id
     JOIN dataset_rows dr ON dr.id = ta.row_id
     WHERE dr.project_id = $1
     GROUP BY t.label
     ORDER BY count DESC
     LIMIT 5`,
    [job.projectId]
  );
  const topTopics = topicsRes.rows;

  const rowCountRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM dataset_rows WHERE project_id = $1`,
    [job.projectId]
  );
  const totalRows: number = rowCountRes.rows[0]?.total ?? 0;

  await setProgress(30);

  // ── 2. LLM call with tool use ─────────────────────────────────────────────
  const userMessage =
    `Project context: ${totalRows} total responses.\n` +
    `Top topics: ${topTopics.map((t: { name: string; count: number }) => `${t.name} (${t.count})`).join(", ")}.\n` +
    (filters && (filters as unknown[]).length > 0 ? `Active filters: ${JSON.stringify(filters)}.\n` : "") +
    (viewId ? `View: ${viewId}.\n` : "") +
    `\nQuestion: ${question}`;

  const runSqlTool: OpenAI.ChatCompletionTool = {
    type: "function",
    function: {
      name: "run_sql",
      description:
        "Execute a read-only SELECT query against the project database to retrieve analytics data. " +
        "Only SELECT statements are allowed. Always filter by project_id = '" + job.projectId + "'.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "The SQL SELECT statement to execute.",
          },
        },
        required: ["sql"],
        additionalProperties: false,
      },
    },
  };

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: INSIGHT_AGENT_SYSTEM },
    { role: "user", content: userMessage },
  ];

  const MAX_TOOL_ITERATIONS = 5;
  let iterations = 0;
  let finalAnswer = "";

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: [runSqlTool],
      tool_choice: "auto",
      temperature: 0.2,
    });

    const choice = response.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      finalAnswer = choice.message.content ?? "";
      break;
    }

    // Execute each tool call (only read-only SQL allowed)
    const toolResults: OpenAI.ChatCompletionToolMessageParam[] = [];
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.function.name !== "run_sql") {
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Unknown tool.",
        });
        continue;
      }

      let queryResult: string;
      try {
        const { sql } = JSON.parse(toolCall.function.arguments) as { sql: string };
        // Safety: only allow SELECT statements
        if (!/^\s*SELECT\s/i.test(sql)) {
          throw new Error("Only SELECT statements are permitted.");
        }
        const res = await pool.query(sql);
        queryResult = JSON.stringify(res.rows);
      } catch (err: unknown) {
        queryResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: queryResult,
      });
    }

    messages.push(...toolResults);
    await setProgress(30 + Math.round((iterations / MAX_TOOL_ITERATIONS) * 60));
  }

  await setProgress(95);

  const result = {
    question,
    answer: finalAnswer,
    context: { totalRows, topTopics, viewId, filters },
    generatedAt: new Date().toISOString(),
  };

  console.log(
    `[insight_agent_ask] project=${job.projectId} iterations=${iterations} question="${question.slice(0, 60)}"`
  );

  return JSON.stringify(result);
}
