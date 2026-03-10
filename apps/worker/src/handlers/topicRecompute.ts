import { pool } from "../db/pool";
import { classifyRows } from "../lib/classify";
import { chunkArray, processInParallel } from "../lib/concurrency";
import { JobContext } from "../types";

const PAGE_SIZE = 500;
const BATCH_SIZE = 20;
const CONCURRENCY = 5;

/**
 * TOPIC_RECOMPUTE
 * payload: { collectionId: string, rowIds?: string[] }
 *
 * Re-runs AI scoring on an existing topic taxonomy.
 * Uses cursor pagination on row_index to avoid loading all rows into memory.
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
  const { project_id: projectId, text_column_id: textColumnId, sentiment_enabled: sentimentEnabled } = collection;

  // ── 2. Load existing topics ───────────────────────────────────────────────
  await setProgress(10);
  const topicRes = await pool.query(
    `SELECT t.id, t.label AS name, '' AS description
     FROM topics t
     JOIN topic_categories tc ON tc.id = t.category_id
     WHERE tc.collection_id = $1
     ORDER BY t.sort_order`,
    [collectionId]
  );
  const topics: Array<{ id: string; name: string; description: string }> = topicRes.rows;
  if (topics.length === 0)
    throw new Error("No topics found for collection; run topic_generation first");

  // ── 3. Paginate + classify in parallel ────────────────────────────────────
  await setProgress(15);

  // When a specific subset of rowIds is provided, load them all (subset is bounded)
  if (rowIds && rowIds.length > 0) {
    const subsetRes = await pool.query(
      `SELECT id, row_index, text_to_analyze->$1 AS text
       FROM dataset_rows
       WHERE project_id = $2 AND id = ANY($3::uuid[])
         AND text_to_analyze ? $1
       ORDER BY row_index ASC`,
      [textColumnId, projectId, rowIds]
    );
    const subsetRows: Array<{ id: string; row_index: number; text: string }> =
      subsetRes.rows.filter((r: { text: string }) => r.text);

    const batches = chunkArray(subsetRows, BATCH_SIZE);
    await processInParallel(batches, CONCURRENCY, async (batch) => {
      await upsertClassifications(batch, topics, sentimentEnabled, projectId);
    });

    console.log(`[topic_recompute] collection=${collectionId} rows_recomputed=${subsetRows.length}`);
    return JSON.stringify({ collectionId, rowsRecomputed: subsetRows.length });
  }

  // Full dataset: cursor pagination
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM dataset_rows WHERE project_id = $1 AND text_to_analyze ? $2`,
    [projectId, textColumnId]
  );
  const totalRows: number = countRes.rows[0]?.total ?? 0;
  let processed = 0;
  let cursor = -1;

  while (true) {
    const pageRes = await pool.query(
      `SELECT id, row_index, text_to_analyze->$1 AS text
       FROM dataset_rows
       WHERE project_id = $2 AND text_to_analyze ? $1 AND row_index > $3
       ORDER BY row_index ASC
       LIMIT $4`,
      [textColumnId, projectId, cursor, PAGE_SIZE]
    );
    if (pageRes.rows.length === 0) break;

    const pageRows: Array<{ id: string; row_index: number; text: string }> =
      pageRes.rows.filter((r: { text: string }) => r.text);

    const batches = chunkArray(pageRows, BATCH_SIZE);
    await processInParallel(batches, CONCURRENCY, async (batch) => {
      await upsertClassifications(batch, topics, sentimentEnabled, projectId);
    });

    processed += pageRows.length;
    cursor = pageRes.rows.at(-1).row_index;
    const pct = 15 + Math.round((processed / Math.max(totalRows, 1)) * 80);
    await setProgress(pct);
  }

  console.log(`[topic_recompute] collection=${collectionId} rows_recomputed=${processed}`);
  return JSON.stringify({ collectionId, rowsRecomputed: processed });
}

async function upsertClassifications(
  batch: Array<{ id: string; text: string }>,
  topics: Array<{ id: string; name: string; description: string }>,
  sentimentEnabled: boolean,
  projectId: string
): Promise<void> {
  const batchInput = batch.map((r, i) => ({ rowIndex: i, text: r.text }));
  const assignments = await classifyRows(batchInput, topics, sentimentEnabled);

  for (const a of assignments) {
    const row = batch[a.rowIndex];
    if (!row) continue;
    const topic = topics[a.topicIndex];
    if (!topic) continue;
    await pool.query(
      `INSERT INTO topic_assignments
         (project_id, row_id, topic_id, sentiment, source, confidence)
       VALUES ($1, $2, $3, $4, 'ai', $5)
       ON CONFLICT (row_id, topic_id) DO UPDATE
         SET sentiment  = EXCLUDED.sentiment,
             source     = EXCLUDED.source,
             confidence = EXCLUDED.confidence`,
      [projectId, row.id, topic.id, a.sentiment ?? null, a.confidence]
    );
  }
}
