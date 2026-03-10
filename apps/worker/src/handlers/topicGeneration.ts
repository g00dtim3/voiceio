import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import {
  TOPIC_GENERATION_SYSTEM,
  topicGenerationUser,
  topicClassificationSystem,
  topicClassificationUser,
} from "../lib/prompts";
import { JobContext } from "../types";

/**
 * TOPIC_GENERATION
 * payload: { collectionId: string, startMode: string, prompt: string | null }
 *
 * Steps:
 *  1. Load the collection + all dataset rows for the project/column  (10%)
 *  2. Call LLM (gpt-4o) to generate topic taxonomy                   (40%)
 *  3. Upsert generated topics into topic_categories + topics          (70%)
 *  4. Call LLM (gpt-4o-mini) in batches to assign every row          (90%)
 *  5. Mark collection status = 'idle'                                (100%)
 */
export async function handleTopicGeneration(ctx: JobContext): Promise<string | null> {
  const { job, setProgress } = ctx;
  const { collectionId, prompt: userPrompt } = job.payload as {
    collectionId: string;
    startMode: string;
    prompt: string | null;
  };

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

  // ── 3. LLM call → generate topics ────────────────────────────────────────
  // Sample up to 200 rows to keep the prompt size manageable
  await setProgress(20);
  const sampleTexts = rows.slice(0, 200).map((r) => r.text);
  const taxonomyResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: TOPIC_GENERATION_SYSTEM },
      { role: "user", content: topicGenerationUser(sampleTexts, userPrompt) },
    ],
    temperature: 0.3,
  });

  const taxonomyContent = taxonomyResponse.choices[0].message.content ?? "{}";
  const taxonomy = JSON.parse(taxonomyContent) as {
    topics: Array<{ name: string; description: string }>;
  };
  const generatedTopics = taxonomy.topics ?? [];
  if (generatedTopics.length === 0) throw new Error("LLM returned an empty topic list");

  // ── 4. Upsert category + topics ───────────────────────────────────────────
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

  await pool.query(`DELETE FROM topics WHERE category_id = $1`, [categoryId]);

  const topicIds: string[] = [];
  for (let i = 0; i < generatedTopics.length; i++) {
    const res = await pool.query(
      `INSERT INTO topics (category_id, label, sort_order)
       VALUES ($1, $2, $3) RETURNING id`,
      [categoryId, generatedTopics[i].name, i]
    );
    topicIds.push(res.rows[0].id);
  }
  await setProgress(70);

  // ── 5. LLM call in batches → assign rows ─────────────────────────────────
  const BATCH_SIZE = 20;
  const classificationSystemPrompt = topicClassificationSystem(
    generatedTopics,
    collection.sentiment_enabled
  );

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
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
      const topicId = topicIds[a.topicIndex];
      if (!topicId) continue;
      const sentiment = collection.sentiment_enabled ? (a.sentiment ?? null) : null;
      await pool.query(
        `INSERT INTO topic_assignments
           (project_id, row_id, topic_id, sentiment, source, confidence)
         VALUES ($1, $2, $3, $4, 'ai', $5)
         ON CONFLICT DO NOTHING`,
        [collection.project_id, row.id, topicId, sentiment, a.confidence ?? 0.8]
      );
    }

    const pct =
      70 +
      Math.round(
        (Math.min(offset + BATCH_SIZE, rows.length) / Math.max(rows.length, 1)) * 20
      );
    await setProgress(pct);
  }

  // ── 6. Mark smart_columns dependent on topics as outdated ─────────────────
  await pool.query(
    `UPDATE smart_columns SET status = 'outdated', updated_at = now()
     WHERE project_id = $1 AND compute_type = 'llm' AND status = 'completed'`,
    [collection.project_id]
  );

  console.log(
    `[topic_generation] collection=${collectionId} topics=${generatedTopics.length} rows_assigned=${rows.length}`
  );

  return JSON.stringify({
    collectionId,
    topicsCreated: generatedTopics.length,
    rowsAssigned: rows.length,
  });
}
