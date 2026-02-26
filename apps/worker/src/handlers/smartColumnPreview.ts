import { pool } from "../db/pool";
import { JobContext } from "../types";

/**
 * SMART_COLUMN_PREVIEW
 * payload: { smartColumnId: string }
 *
 * Computes values for a random sample of rows (up to 20) so the user can
 * validate the column config before doing a full fill.
 */
export async function handleSmartColumnPreview(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { smartColumnId } = job.payload as { smartColumnId: string };

  await setProgress(10);
  const colRes = await pool.query(
    `SELECT id, project_id, name, output_type, compute_type, source_columns, config
     FROM smart_columns WHERE id = $1`,
    [smartColumnId]
  );
  if (colRes.rows.length === 0) throw new Error(`SmartColumn ${smartColumnId} not found`);
  const col = colRes.rows[0];

  // Sample up to 20 rows
  const rowRes = await pool.query(
    `SELECT id FROM dataset_rows
     WHERE project_id = $1
     ORDER BY random()
     LIMIT 20`,
    [col.project_id]
  );
  const sampleRows: string[] = rowRes.rows.map((r: { id: string }) => r.id);

  await setProgress(30);

  const previewValues: Record<string, unknown> = {};
  for (let i = 0; i < sampleRows.length; i++) {
    // [STUB] In production: call the same compute logic as SMART_COLUMN_FILL
    previewValues[sampleRows[i]] = computeStubValue(col.output_type, i);
    await setProgress(30 + Math.round(((i + 1) / sampleRows.length) * 60));
  }

  console.log(`[smart_column_preview] column=${smartColumnId} sample=${sampleRows.length}`);

  // Return preview as resultRef JSON (API can serve it directly from the job)
  return JSON.stringify({ smartColumnId, preview: previewValues });
}

function computeStubValue(outputType: string, idx: number): unknown {
  switch (outputType) {
    case "number":  return idx * 1.5;
    case "boolean": return idx % 2 === 0;
    case "date":    return new Date().toISOString().slice(0, 10);
    case "json":    return { preview: true, idx };
    default:        return `preview_${idx}`;
  }
}
