import { pool } from "../db/pool";
import { JobContext } from "../types";

type FillMode = "outdated" | "all" | "future";

/**
 * SMART_COLUMN_FILL
 * payload: { smartColumnId: string, mode: FillMode }
 *
 * Steps:
 *  1. Load smart column config                              (5%)
 *  2. Determine rows to compute (mode: outdated|all|future) (15%)
 *  3. [stub] Compute values (mapping/formula/llm)           (15–90%)
 *  4. Upsert smart_column_values                            (90%)
 *  5. Mark column status = 'completed'                     (100%)
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

  // Mark running
  await pool.query(
    `UPDATE smart_columns SET status = 'running', updated_at = now() WHERE id = $1`,
    [smartColumnId]
  );

  // ── 2. Determine rows ──────────────────────────────────────────────────────
  await setProgress(15);
  let rowQuery: string;
  if (mode === "all") {
    rowQuery = `SELECT id FROM dataset_rows WHERE project_id = $1 ORDER BY row_index ASC`;
  } else {
    // outdated / future: rows without an existing computed value
    rowQuery = `
      SELECT dr.id
      FROM dataset_rows dr
      LEFT JOIN smart_column_values scv
        ON scv.smart_column_id = $2 AND scv.row_id = dr.id
      WHERE dr.project_id = $1 AND scv.id IS NULL
      ORDER BY dr.row_index ASC`;
  }

  const params = mode === "all" ? [col.project_id] : [col.project_id, smartColumnId];
  const rowRes = await pool.query(rowQuery, params);
  const rowIds: string[] = rowRes.rows.map((r: { id: string }) => r.id);

  // ── 3. [STUB] Compute values ───────────────────────────────────────────────
  // In production:
  //   - mapping  → use config.mappingTable to look up row column values
  //   - formula  → evaluate config.expression (sandboxed)
  //   - llm      → call Anthropic with source column texts per row
  const batchSize = 50;
  let processed = 0;

  for (let offset = 0; offset < rowIds.length; offset += batchSize) {
    const batch = rowIds.slice(offset, offset + batchSize);

    for (const rowId of batch) {
      const stubValue = computeStubValue(col.output_type, col.compute_type, processed);
      await pool.query(
        `INSERT INTO smart_column_values (smart_column_id, row_id, value, confidence)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (smart_column_id, row_id)
         DO UPDATE SET value = EXCLUDED.value,
                       confidence = EXCLUDED.confidence,
                       computed_at = now()`,
        [smartColumnId, rowId, JSON.stringify(stubValue), 0.9]
      );
      processed++;
    }

    const pct = 15 + Math.round((Math.min(offset + batchSize, rowIds.length) / Math.max(rowIds.length, 1)) * 75);
    await setProgress(pct);
  }

  // ── 4. Mark column completed ───────────────────────────────────────────────
  await pool.query(
    `UPDATE smart_columns SET status = 'completed', updated_at = now() WHERE id = $1`,
    [smartColumnId]
  );

  console.log(
    `[smart_column_fill] column=${smartColumnId} mode=${mode} rows_filled=${processed}`
  );

  return JSON.stringify({ smartColumnId, mode, rowsFilled: processed });
}

function computeStubValue(outputType: string, _computeType: string, idx: number): unknown {
  switch (outputType) {
    case "number":  return idx % 10;
    case "boolean": return idx % 2 === 0;
    case "date":    return new Date().toISOString().slice(0, 10);
    case "json":    return { stub: true, idx };
    default:        return `computed_${idx}`;
  }
}
