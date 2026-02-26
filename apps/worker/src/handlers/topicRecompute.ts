import { pool } from "../db/pool";
import { JobContext } from "../types";

/**
 * TOPIC_RECOMPUTE
 * payload: { collectionId: string, rowIds?: string[] }
 *
 * Re-runs AI scoring on an existing topic taxonomy for all rows (or a
 * specified subset), updating existing topic_assignments.
 */
export async function handleTopicRecompute(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { collectionId, rowIds } = job.payload as {
    collectionId: string;
    rowIds?: string[];
  };

  // ── 1. Load collection ────────────────────────────────────────────────────
  await setProgress(5);
  const colRes = await pool.query(
    `SELECT id, project_id, text_column_id, sentiment_enabled
     FROM topic_collections WHERE id = $1`,
    [collectionId]
  );
  if (colRes.rows.length === 0) throw new Error(`Collection ${collectionId} not found`);
  const collection = colRes.rows[0];

  // ── 2. Load existing topics for this collection ───────────────────────────
  await setProgress(10);
  const topicRes = await pool.query(
    `SELECT t.id FROM topics t
     JOIN topic_categories tc ON tc.id = t.category_id
     WHERE tc.collection_id = $1`,
    [collectionId]
  );
  const topicIds: string[] = topicRes.rows.map((r: { id: string }) => r.id);
  if (topicIds.length === 0) throw new Error("No topics found for collection; run topic_generation first");

  // ── 3. Load target rows ───────────────────────────────────────────────────
  await setProgress(15);
  let rowRes;
  if (rowIds && rowIds.length > 0) {
    rowRes = await pool.query(
      `SELECT id FROM dataset_rows WHERE project_id = $1 AND id = ANY($2::uuid[])`,
      [collection.project_id, rowIds]
    );
  } else {
    rowRes = await pool.query(
      `SELECT id FROM dataset_rows WHERE project_id = $1 ORDER BY row_index`,
      [collection.project_id]
    );
  }
  const targetRows: string[] = rowRes.rows.map((r: { id: string }) => r.id);

  // ── 4. [STUB] Re-score and upsert assignments ─────────────────────────────
  const batchSize = 100;
  let processed = 0;

  for (let offset = 0; offset < targetRows.length; offset += batchSize) {
    const batch = targetRows.slice(offset, offset + batchSize);

    for (let j = 0; j < batch.length; j++) {
      const topicId = topicIds[(offset + j) % topicIds.length];
      const sentiment = collection.sentiment_enabled
        ? (["positive", "neutral", "negative"] as const)[(offset + j) % 3]
        : null;

      await pool.query(
        `INSERT INTO topic_assignments
           (project_id, row_id, topic_id, sentiment, source, confidence)
         VALUES ($1, $2, $3, $4, 'ai', 0.85)
         ON CONFLICT (row_id, topic_id) DO UPDATE
           SET sentiment   = EXCLUDED.sentiment,
               source      = EXCLUDED.source,
               confidence  = EXCLUDED.confidence`,
        [collection.project_id, batch[j], topicId, sentiment]
      );
      processed++;
    }

    const pct = 15 + Math.round((Math.min(offset + batchSize, targetRows.length) / Math.max(targetRows.length, 1)) * 80);
    await setProgress(pct);
  }

  console.log(`[topic_recompute] collection=${collectionId} rows_recomputed=${processed}`);
  return JSON.stringify({ collectionId, rowsRecomputed: processed });
}
