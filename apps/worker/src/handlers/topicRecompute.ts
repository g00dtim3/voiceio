import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import { topicClassificationSystem, topicClassificationUser } from "../lib/prompts";
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

  // ── 3. Load target rows with their texts ─────────────────────────────────
  await setProgress(15);
  let rowRes;
  if (rowIds && rowIds.length > 0) {
    rowRes = await pool.query(
      `SELECT id, text_to_analyze->$1 AS text
       FROM dataset_rows
       WHERE project_id = $2 AND id = ANY($3::uuid[])`,
      [collection.text_column_id, collection.project_id, rowIds]
    );
  } else {
    rowRes = await pool.query(
      `SELECT id, text_to_analyze->$1 AS text
       FROM dataset_rows
       WHERE project_id = $2
       ORDER BY row_index`,
      [collection.text_column_id, collection.project_id]
    );
  }
  const targetRows: Array<{ id: string; text: string }> = rowRes.rows.filter((r) => r.text);

  // ── 4. Classify rows in batches via LLM ──────────────────────────────────
  const BATCH_SIZE = 20;
  const classificationSystemPrompt = topicClassificationSystem(
    topics,
    collection.sentiment_enabled
  );
  let processed = 0;

  for (let offset = 0; offset < targetRows.length; offset += BATCH_SIZE) {
    const batch = targetRows.slice(offset, offset + BATCH_SIZE);
    const batchTexts = batch.map((r) => r.text);

    const classRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: classificationSystemPrompt },
        { role: "user", content: topicClassificationUser(batchTexts) },
      ],
      temperature: 0,
    });

    const classContent = classRes.choices[0].message.content ?? "{}";
    const classification = JSON.parse(classContent) as {
      assignments: Array<{
        rowIndex: number;
        topicIndex: number;
        confidence: number;
        sentiment?: string;
      }>;
    };

    for (const a of classification.assignments ?? []) {
      const row = batch[a.rowIndex];
      if (!row) continue;
      const topic = topics[a.topicIndex];
      if (!topic) continue;
      const sentiment = collection.sentiment_enabled ? (a.sentiment ?? null) : null;

      await pool.query(
        `INSERT INTO topic_assignments
           (project_id, row_id, topic_id, sentiment, source, confidence)
         VALUES ($1, $2, $3, $4, 'ai', $5)
         ON CONFLICT (row_id, topic_id) DO UPDATE
           SET sentiment  = EXCLUDED.sentiment,
               source     = EXCLUDED.source,
               confidence = EXCLUDED.confidence`,
        [collection.project_id, row.id, topic.id, sentiment, a.confidence ?? 0.85]
      );
      processed++;
    }

    const pct =
      15 +
      Math.round(
        (Math.min(offset + BATCH_SIZE, targetRows.length) / Math.max(targetRows.length, 1)) * 80
      );
    await setProgress(pct);
  }

  console.log(`[topic_recompute] collection=${collectionId} rows_recomputed=${processed}`);
  return JSON.stringify({ collectionId, rowsRecomputed: processed });
}
