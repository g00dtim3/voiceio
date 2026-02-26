import { pool } from "../db/pool";
import { JobContext } from "../types";

/**
 * TOPIC_GENERATION
 * payload: { collectionId: string, startMode: string, prompt: string | null }
 *
 * Steps:
 *  1. Load the collection + all dataset rows for the project/column  (10%)
 *  2. [stub] Call LLM to generate topic list                          (40%)
 *  3. Upsert generated topics into topic_categories + topics          (70%)
 *  4. [stub] Assign every row to the most-relevant topic              (90%)
 *  5. Mark collection status = 'idle'                                (100%)
 */
export async function handleTopicGeneration(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { collectionId } = job.payload as { collectionId: string; startMode: string; prompt: string | null };

  // ── 1. Load collection ────────────────────────────────────────────────────
  await setProgress(5);
  const colRes = await pool.query(
    `SELECT id, project_id, text_column_id, language, sentiment_enabled
     FROM topic_collections WHERE id = $1`,
    [collectionId]
  );
  if (colRes.rows.length === 0) throw new Error(`Collection ${collectionId} not found`);
  const collection = colRes.rows[0];

  // ── 2. Load dataset rows ──────────────────────────────────────────────────
  await setProgress(10);
  const rowRes = await pool.query(
    `SELECT id, text_to_analyze->$1 AS text
     FROM dataset_rows
     WHERE project_id = $2 AND text_to_analyze ? $1
     ORDER BY row_index ASC`,
    [collection.text_column_id, collection.project_id]
  );
  const rows: Array<{ id: string; text: string }> = rowRes.rows.filter((r) => r.text);

  // ── 3. [STUB] LLM call → generate topics ─────────────────────────────────
  // In production: call Anthropic Messages API with the aggregated texts and
  // prompt to produce a topic taxonomy. Here we generate deterministic stubs.
  await setProgress(40);
  const stubTopics = [
    { name: "Product Quality", description: "Feedback about quality" },
    { name: "Customer Service", description: "Support interactions" },
    { name: "Pricing", description: "Price and value" },
    { name: "Delivery", description: "Shipping and logistics" },
    { name: "Other", description: "Uncategorised feedback" },
  ];

  // ── 4. Upsert a default category + topics ────────────────────────────────
  await setProgress(50);
  const catRes = await pool.query(
    `INSERT INTO topic_categories (collection_id, name, sort_order)
     VALUES ($1, 'Generated', 0)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [collectionId]
  );

  let categoryId: string;
  if (catRes.rows.length > 0) {
    categoryId = catRes.rows[0].id;
  } else {
    const existing = await pool.query(
      `SELECT id FROM topic_categories WHERE collection_id = $1 LIMIT 1`,
      [collectionId]
    );
    categoryId = existing.rows[0].id;
  }

  await pool.query(
    `DELETE FROM topics WHERE category_id = $1`,
    [categoryId]
  );

  const topicIds: string[] = [];
  for (let i = 0; i < stubTopics.length; i++) {
    const res = await pool.query(
      `INSERT INTO topics (category_id, label, sort_order)
       VALUES ($1, $2, $3) RETURNING id`,
      [categoryId, stubTopics[i].name, i]
    );
    topicIds.push(res.rows[0].id);
  }
  await setProgress(70);

  // ── 5. [STUB] Assign rows round-robin (placeholder for LLM scoring) ──────
  const batchSize = 100;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    for (let j = 0; j < batch.length; j++) {
      const topicId = topicIds[(offset + j) % topicIds.length];
      const sentiment = collection.sentiment_enabled
        ? (["positive", "neutral", "negative"] as const)[(offset + j) % 3]
        : null;
      await pool.query(
        `INSERT INTO topic_assignments
           (project_id, row_id, topic_id, sentiment, source, confidence)
         VALUES ($1, $2, $3, $4, 'ai', 0.8)
         ON CONFLICT DO NOTHING`,
        [collection.project_id, batch[j].id, topicId, sentiment]
      );
    }
    const pct = 70 + Math.round((Math.min(offset + batchSize, rows.length) / Math.max(rows.length, 1)) * 20);
    await setProgress(pct);
  }

  // ── 6. Mark smart_columns dependent on topics as outdated ─────────────────
  await pool.query(
    `UPDATE smart_columns SET status = 'outdated', updated_at = now()
     WHERE project_id = $1 AND compute_type = 'llm' AND status = 'completed'`,
    [collection.project_id]
  );

  console.log(
    `[topic_generation] collection=${collectionId} topics=${stubTopics.length} rows_assigned=${rows.length}`
  );

  return JSON.stringify({ collectionId, topicsCreated: stubTopics.length, rowsAssigned: rows.length });
}
