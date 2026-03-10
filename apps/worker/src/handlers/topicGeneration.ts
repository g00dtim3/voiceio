import { pool } from "../db/pool";
import { openai } from "../lib/openai";
import { classifyRows } from "../lib/classify";
import { chunkArray, processInParallel } from "../lib/concurrency";
import { TOPIC_GENERATION_SYSTEM, topicGenerationUser } from "../lib/prompts";
import { JobContext } from "../types";

const PAGE_SIZE = 500;
const BATCH_SIZE = 20;
const CONCURRENCY = 5;

/**
 * TOPIC_GENERATION
 * payload: { collectionId: string, startMode: string, prompt: string | null }
 *
 * Steps:
 *  1. Load the collection                                            (5%)
 *  2. Sample up to 200 rows → call gpt-4o to generate taxonomy      (20%)
 *  3. Upsert topics into topic_categories + topics                  (50%)
 *  4. Paginate all rows (cursor on row_index) + classify in parallel (50–90%)
 *  5. Mark outdated smart columns                                   (100%)
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
  const { project_id: projectId, text_column_id: textColumnId, sentiment_enabled: sentimentEnabled } = collection;

  // ── 2. Sample rows → generate topic taxonomy ──────────────────────────────
  await setProgress(10);
  const sampleRes = await pool.query(
    `SELECT text_to_analyze->$1 AS text
     FROM dataset_rows
     WHERE project_id = $2 AND text_to_analyze ? $1
     ORDER BY row_index ASC
     LIMIT 200`,
    [textColumnId, projectId]
  );
  const sampleTexts: string[] = sampleRes.rows.map((r: { text: string }) => r.text).filter(Boolean);

  await setProgress(15);
  const taxonomyResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: TOPIC_GENERATION_SYSTEM },
      { role: "user", content: topicGenerationUser(sampleTexts, userPrompt) },
    ],
    temperature: 0.3,
  });

  const taxonomy = JSON.parse(taxonomyResponse.choices[0].message.content ?? "{}") as {
    topics: Array<{ name: string; description: string }>;
  };
  const generatedTopics = taxonomy.topics ?? [];
  if (generatedTopics.length === 0) throw new Error("LLM returned an empty topic list");

  // ── 3. Upsert category + topics ───────────────────────────────────────────
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
      `INSERT INTO topics (category_id, label, sort_order) VALUES ($1, $2, $3) RETURNING id`,
      [categoryId, generatedTopics[i].name, i]
    );
    topicIds.push(res.rows[0].id);
  }

  // ── 4. Paginate + classify in parallel ────────────────────────────────────
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
      const batchInput = batch.map((r, i) => ({ rowIndex: i, text: r.text }));
      const assignments = await classifyRows(batchInput, generatedTopics, sentimentEnabled);

      for (const a of assignments) {
        const row = batch[a.rowIndex];
        if (!row) continue;
        const topicId = topicIds[a.topicIndex];
        if (!topicId) continue;
        await pool.query(
          `INSERT INTO topic_assignments
             (project_id, row_id, topic_id, sentiment, source, confidence)
           VALUES ($1, $2, $3, $4, 'ai', $5)
           ON CONFLICT DO NOTHING`,
          [projectId, row.id, topicId, a.sentiment ?? null, a.confidence]
        );
      }
    });

    processed += pageRows.length;
    cursor = pageRes.rows.at(-1).row_index;
    const pct = 50 + Math.round((processed / Math.max(totalRows, 1)) * 40);
    await setProgress(pct);
  }

  // ── 5. Mark dependent smart columns as outdated ───────────────────────────
  await pool.query(
    `UPDATE smart_columns SET status = 'outdated', updated_at = now()
     WHERE project_id = $1 AND compute_type = 'llm' AND status = 'completed'`,
    [projectId]
  );

  console.log(
    `[topic_generation] collection=${collectionId} topics=${generatedTopics.length} rows_assigned=${processed}`
  );
  return JSON.stringify({ collectionId, topicsCreated: generatedTopics.length, rowsAssigned: processed });
}
