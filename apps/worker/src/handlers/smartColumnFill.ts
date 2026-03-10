import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import { chunkArray, processInParallel } from "../lib/concurrency";
import { smartColumnUser } from "../lib/prompts";
import { JobContext } from "../types";

type FillMode = "outdated" | "all" | "future";

const PAGE_SIZE = 500;
const BATCH_SIZE = 20;
const CONCURRENCY = 5;

/**
 * SMART_COLUMN_FILL
 * payload: { smartColumnId: string, mode: FillMode }
 *
 * For compute_type=llm: cursor-paginated rows + parallel LLM batches.
 * For mapping/formula: stub values (not yet implemented server-side).
 */
export async function handleSmartColumnFill(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { smartColumnId, mode = "outdated" } = job.payload as {
    smartColumnId: string;
    mode?: FillMode;
  };

  // ── 1. Load column ────────────────────────────────────────────────────────
  await setProgress(5);
  const colRes = await pool.query(
    `SELECT id, project_id, name, output_type, compute_type, source_columns, config
     FROM smart_columns WHERE id = $1`,
    [smartColumnId]
  );
  if (colRes.rows.length === 0) throw new Error(`SmartColumn ${smartColumnId} not found`);
  const col = colRes.rows[0];

  await pool.query(
    `UPDATE smart_columns SET status = 'running', updated_at = now() WHERE id = $1`,
    [smartColumnId]
  );

  let processed = 0;

  if (col.compute_type === "llm") {
    // ── LLM path: cursor pagination + parallel batches ──────────────────────
    const sourceColumns: string[] = col.source_columns ?? [];
    const userPrompt: string = col.config?.prompt ?? "Transform the input text.";

    const countRes = await pool.query(buildCountQuery(mode), buildCountParams(mode, col.project_id, smartColumnId));
    const totalRows: number = countRes.rows[0]?.total ?? 0;

    let cursor = -1;

    while (true) {
      const pageRes = await pool.query(
        buildPageQuery(mode),
        buildPageParams(mode, col.project_id, smartColumnId, cursor, PAGE_SIZE)
      );
      if (pageRes.rows.length === 0) break;

      const pageRows: Array<{ id: string; row_index: number; text_to_analyze: Record<string, string> }> =
        pageRes.rows;

      const batches = chunkArray(pageRows, BATCH_SIZE);

      await processInParallel(batches, CONCURRENCY, async (batch) => {
        const batchRows = batch.map((r, i) => ({
          rowIndex: i,
          rowId: r.id,
          sources: Object.fromEntries(
            sourceColumns
              .filter((c) => r.text_to_analyze?.[c] != null)
              .map((c) => [c, String(r.text_to_analyze[c])])
          ),
        }));

        const llmRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: userPrompt },
            { role: "user", content: smartColumnUser(batchRows, col.output_type) },
          ],
          temperature: 0,
        });

        const llmParsed = JSON.parse(llmRes.choices[0].message.content ?? "{}") as {
          results: Array<{ rowIndex: number; value: unknown; confidence: number }>;
        };

        for (const result of llmParsed.results ?? []) {
          const row = batchRows[result.rowIndex];
          if (!row) continue;
          await pool.query(
            `INSERT INTO smart_column_values (smart_column_id, row_id, value, confidence)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (smart_column_id, row_id)
             DO UPDATE SET value = EXCLUDED.value,
                           confidence = EXCLUDED.confidence,
                           computed_at = now()`,
            [smartColumnId, row.rowId, JSON.stringify(result.value), result.confidence ?? 0.9]
          );
        }
      });

      processed += pageRows.length;
      cursor = pageRes.rows.at(-1).row_index;
      const pct = 15 + Math.round((processed / Math.max(totalRows, 1)) * 75);
      await setProgress(pct);
    }
  } else {
    // ── mapping / formula: stub values (not yet implemented server-side) ─────
    await setProgress(15);
    const rowRes = await pool.query(
      mode === "all"
        ? `SELECT id FROM dataset_rows WHERE project_id = $1 ORDER BY row_index ASC`
        : `SELECT dr.id FROM dataset_rows dr
           LEFT JOIN smart_column_values scv ON scv.smart_column_id = $2 AND scv.row_id = dr.id
           WHERE dr.project_id = $1 AND scv.id IS NULL ORDER BY dr.row_index ASC`,
      mode === "all" ? [col.project_id] : [col.project_id, smartColumnId]
    );
    const rowIds: string[] = rowRes.rows.map((r: { id: string }) => r.id);

    for (let offset = 0; offset < rowIds.length; offset += BATCH_SIZE) {
      const batch = rowIds.slice(offset, offset + BATCH_SIZE);
      for (const rowId of batch) {
        await pool.query(
          `INSERT INTO smart_column_values (smart_column_id, row_id, value, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (smart_column_id, row_id)
           DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, computed_at = now()`,
          [smartColumnId, rowId, JSON.stringify(computeStubValue(col.output_type, processed)), 0.9]
        );
        processed++;
      }
      const pct = 15 + Math.round((Math.min(offset + BATCH_SIZE, rowIds.length) / Math.max(rowIds.length, 1)) * 75);
      await setProgress(pct);
    }
  }

  await pool.query(
    `UPDATE smart_columns SET status = 'completed', updated_at = now() WHERE id = $1`,
    [smartColumnId]
  );

  console.log(`[smart_column_fill] column=${smartColumnId} mode=${mode} rows_filled=${processed}`);
  return JSON.stringify({ smartColumnId, mode, rowsFilled: processed });
}

// ── Query builders ────────────────────────────────────────────────────────────

function buildCountQuery(mode: FillMode): string {
  if (mode === "all") {
    return `SELECT COUNT(*)::int AS total FROM dataset_rows WHERE project_id = $1`;
  }
  return `SELECT COUNT(*)::int AS total
          FROM dataset_rows dr
          LEFT JOIN smart_column_values scv ON scv.smart_column_id = $2 AND scv.row_id = dr.id
          WHERE dr.project_id = $1 AND scv.id IS NULL`;
}

function buildCountParams(mode: FillMode, projectId: string, smartColumnId: string): unknown[] {
  return mode === "all" ? [projectId] : [projectId, smartColumnId];
}

function buildPageQuery(mode: FillMode): string {
  const baseSelect = `SELECT id, row_index, text_to_analyze FROM dataset_rows`;
  if (mode === "all") {
    return `${baseSelect} WHERE project_id = $1 AND row_index > $2 ORDER BY row_index ASC LIMIT $3`;
  }
  return `${baseSelect}
          WHERE project_id = $1 AND row_index > $2
            AND id NOT IN (
              SELECT row_id FROM smart_column_values WHERE smart_column_id = $4
            )
          ORDER BY row_index ASC LIMIT $3`;
}

function buildPageParams(
  mode: FillMode,
  projectId: string,
  smartColumnId: string,
  cursor: number,
  pageSize: number
): unknown[] {
  return mode === "all"
    ? [projectId, cursor, pageSize]
    : [projectId, cursor, pageSize, smartColumnId];
}

function computeStubValue(outputType: string, idx: number): unknown {
  switch (outputType) {
    case "number":  return idx % 10;
    case "boolean": return idx % 2 === 0;
    case "date":    return new Date().toISOString().slice(0, 10);
    case "json":    return { stub: true, idx };
    default:        return `computed_${idx}`;
  }
}
