import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import { smartColumnUser } from "../lib/prompts";
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
    `SELECT id, text_to_analyze
     FROM dataset_rows
     WHERE project_id = $1
     ORDER BY random()
     LIMIT 20`,
    [col.project_id]
  );
  const sampleRows: Array<{ id: string; text_to_analyze: Record<string, string> }> = rowRes.rows;

  await setProgress(30);

  const previewValues: Record<string, unknown> = {};

  if (col.compute_type === "llm" && sampleRows.length > 0) {
    const sourceColumns: string[] = col.source_columns ?? [];
    const userPrompt: string = col.config?.prompt ?? "Transform the input text.";

    const batchRows = sampleRows.map((r, i) => ({
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

    const llmContent = llmRes.choices[0].message.content ?? "{}";
    const llmParsed = JSON.parse(llmContent) as {
      results: Array<{ rowIndex: number; value: unknown; confidence: number }>;
    };

    for (const result of llmParsed.results ?? []) {
      const row = batchRows[result.rowIndex];
      if (!row) continue;
      previewValues[row.rowId] = result.value;
    }
  } else {
    for (let i = 0; i < sampleRows.length; i++) {
      previewValues[sampleRows[i].id] = computeStubValue(col.output_type, i);
    }
  }

  await setProgress(90);
  console.log(`[smart_column_preview] column=${smartColumnId} sample=${sampleRows.length}`);
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
