import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { TopicCategory, TopicCollection, Topic } from "../types";
import { enqueueJob } from "./jobs";

export const topicsRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToCollection(r: Record<string, unknown>): TopicCollection {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    textColumnId: r.text_column_id as string,
    language: r.language as string,
    sentimentEnabled: r.sentiment_enabled as boolean,
    createdAt: (r.created_at as Date).toISOString(),
  };
}

function rowToTopic(r: Record<string, unknown>): Topic {
  return {
    id: r.id as string,
    categoryId: r.category_id as string,
    label: r.label as string,
    description: (r.description as string) ?? null,
    sentimentEnabled: r.sentiment_enabled as boolean,
    sentimentLabels: (r.sentiment_labels as Record<string, string>) ?? {},
    sortOrder: r.sort_order as number,
  };
}

/**
 * Returns true when at least one human-reviewed assignment exists
 * for any topic inside the given collection.
 * GWT guard: "Given at least one topic assignment has reviewed=true"
 */
async function hasReviewedAssignments(collectionId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM topic_assignments ta
     JOIN topics t         ON t.id  = ta.topic_id
     JOIN topic_categories tc ON tc.id = t.category_id
     WHERE tc.collection_id = $1
       AND ta.reviewed = true
     LIMIT 1`,
    [collectionId]
  );
  return rows.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/topics/collections ──────────────────────────────
topicsRouter.get("/collections", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, text_column_id, language, sentiment_enabled, created_at
       FROM topic_collections
       WHERE project_id = $1
       ORDER BY created_at ASC`,
      [projectId]
    );
    res.json({ items: rows.map(rowToCollection), page: 1, pageSize: rows.length, total: rows.length });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list collections", req.requestId);
  }
});

// ─── POST /projects/:projectId/topics/collections ─────────────────────────────
// GWT: "When user starts analysis with startMode=scratch
//       Then system creates a topic collection
//       And enqueues TOPIC_GENERATION job
//       And shows generating state until completion"
const CreateCollectionSchema = z.object({
  textColumnId: z.string().min(1),
  language: z.string().min(2).default("en"),
  startMode: z.enum(["scratch", "template", "inherit", "import_file"]).default("scratch"),
  enableSentiment: z.boolean().default(false),
  prompt: z.string().nullable().optional(),
  force: z.boolean().default(false),
});

topicsRouter.post("/collections", async (req: Request, res: Response) => {
  const parsed = CreateCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { textColumnId, language, enableSentiment, startMode, prompt, force } = parsed.data;

  try {
    // If re-triggering an existing collection and trying to enable sentiment,
    // check for the GWT CONFLICT guard before the upsert touches the DB.
    const existing = await pool.query(
      `SELECT id, sentiment_enabled FROM topic_collections
       WHERE project_id = $1 AND text_column_id = $2`,
      [projectId, textColumnId]
    );

    if (existing.rows.length > 0 && enableSentiment && !existing.rows[0].sentiment_enabled) {
      const blocked = await hasReviewedAssignments(existing.rows[0].id as string);
      if (blocked) {
        sendError(res, 409, "CONFLICT",
          "Sentiment cannot be enabled after reviews exist",
          req.requestId,
          { collectionId: existing.rows[0].id }
        );
        return;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO topic_collections (project_id, text_column_id, language, sentiment_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, text_column_id) DO UPDATE
         SET language          = EXCLUDED.language,
             sentiment_enabled = EXCLUDED.sentiment_enabled
       RETURNING id, project_id, text_column_id, language, sentiment_enabled, created_at`,
      [projectId, textColumnId, language, enableSentiment]
    );
    const collectionId: string = rows[0].id as string;

    const job = await enqueueJob(
      projectId,
      "topic_generation",
      { collectionId, startMode, prompt: prompt ?? null },
      force
    );

    res.status(202).json({ collection: rowToCollection(rows[0]), job });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to start topic analysis", req.requestId);
  }
});

// ─── GET /projects/:projectId/topics/collections/:collectionId ────────────────
topicsRouter.get("/collections/:collectionId", async (req: Request, res: Response) => {
  const { projectId, collectionId } = req.params;
  try {
    const [colRes, jobRes] = await Promise.all([
      pool.query(
        `SELECT id, project_id, text_column_id, language, sentiment_enabled, created_at
         FROM topic_collections
         WHERE id = $1 AND project_id = $2`,
        [collectionId, projectId]
      ),
      pool.query(
        `SELECT id, status, progress, error, updated_at
         FROM jobs
         WHERE project_id = $1
           AND type = 'topic_generation'
           AND payload->>'collectionId' = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [projectId, collectionId]
      ),
    ]);

    if (colRes.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Collection not found", req.requestId);
      return;
    }

    const latestJob = jobRes.rows[0] ?? null;
    res.json({
      ...rowToCollection(colRes.rows[0]),
      generationJob: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            progress: latestJob.progress,
            error: latestJob.error ?? null,
            updatedAt: (latestJob.updated_at as Date).toISOString(),
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get collection", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/topics/collections/:collectionId ──────────────
// GWT: "When user toggles sentiment enabled on collection
//       And at least one assignment has reviewed=true → CONFLICT"
const PatchCollectionSchema = z.object({
  language: z.string().min(2).optional(),
  sentimentEnabled: z.boolean().optional(),
});

topicsRouter.patch("/collections/:collectionId", async (req: Request, res: Response) => {
  const parsed = PatchCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, collectionId } = req.params;
  const { language, sentimentEnabled } = parsed.data;

  try {
    const colRes = await pool.query(
      `SELECT id, sentiment_enabled FROM topic_collections
       WHERE id = $1 AND project_id = $2`,
      [collectionId, projectId]
    );
    if (colRes.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Collection not found", req.requestId);
      return;
    }

    // GWT guard: block enabling sentiment when reviews already exist
    if (sentimentEnabled === true && !(colRes.rows[0].sentiment_enabled as boolean)) {
      const blocked = await hasReviewedAssignments(collectionId);
      if (blocked) {
        sendError(res, 409, "CONFLICT",
          "Sentiment cannot be enabled after reviews exist",
          req.requestId
        );
        return;
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (language !== undefined)         { fields.push(`language = $${i++}`);          values.push(language); }
    if (sentimentEnabled !== undefined) { fields.push(`sentiment_enabled = $${i++}`); values.push(sentimentEnabled); }

    if (fields.length === 0) { sendError(res, 422, "VALIDATION_ERROR", "Nothing to update", req.requestId); return; }

    values.push(collectionId);
    const { rows } = await pool.query(
      `UPDATE topic_collections SET ${fields.join(", ")}
       WHERE id = $${i}
       RETURNING id, project_id, text_column_id, language, sentiment_enabled, created_at`,
      values
    );
    res.json(rowToCollection(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update collection", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES + TOPICS  (taxonomy editing shown after generation completes)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/topics/collections/:collectionId/categories ─────
topicsRouter.get("/collections/:collectionId/categories", async (req: Request, res: Response) => {
  const { projectId, collectionId } = req.params;
  try {
    const owns = await pool.query(
      `SELECT id FROM topic_collections WHERE id = $1 AND project_id = $2`,
      [collectionId, projectId]
    );
    if (owns.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Collection not found", req.requestId);
      return;
    }

    const catRes = await pool.query(
      `SELECT id, collection_id, name, sort_order
       FROM topic_categories
       WHERE collection_id = $1
       ORDER BY sort_order ASC, name ASC`,
      [collectionId]
    );

    if (catRes.rows.length === 0) { res.json({ items: [] }); return; }

    const categoryIds: string[] = catRes.rows.map((r: Record<string, unknown>) => r.id as string);

    const topicRes = await pool.query(
      `SELECT t.id, t.category_id, t.label, t.description,
              t.sentiment_enabled, t.sentiment_labels, t.sort_order,
              COUNT(ta.id)::int AS assignment_count
       FROM topics t
       LEFT JOIN topic_assignments ta ON ta.topic_id = t.id
       WHERE t.category_id = ANY($1::uuid[])
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.label ASC`,
      [categoryIds]
    );

    const topicsByCategory = new Map<string, Topic[]>();
    for (const t of topicRes.rows) {
      const topic: Topic = {
        id: t.id as string,
        categoryId: t.category_id as string,
        label: t.label as string,
        description: (t.description as string) ?? null,
        sentimentEnabled: t.sentiment_enabled as boolean,
        sentimentLabels: (t.sentiment_labels as Record<string, string>) ?? {},
        sortOrder: t.sort_order as number,
        assignmentCount: t.assignment_count as number,
      };
      const list = topicsByCategory.get(t.category_id as string) ?? [];
      list.push(topic);
      topicsByCategory.set(t.category_id as string, list);
    }

    const items: TopicCategory[] = catRes.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      collectionId: r.collection_id as string,
      name: r.name as string,
      sortOrder: r.sort_order as number,
      topics: topicsByCategory.get(r.id as string) ?? [],
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list categories", req.requestId);
  }
});

// ─── POST /projects/:projectId/topics/collections/:collectionId/categories ────
const CreateCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

topicsRouter.post("/collections/:collectionId/categories", async (req: Request, res: Response) => {
  const parsed = CreateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }
  const { projectId, collectionId } = req.params;
  try {
    const owns = await pool.query(
      `SELECT id FROM topic_collections WHERE id = $1 AND project_id = $2`,
      [collectionId, projectId]
    );
    if (owns.rows.length === 0) { sendError(res, 404, "NOT_FOUND", "Collection not found", req.requestId); return; }

    const { rows } = await pool.query(
      `INSERT INTO topic_categories (collection_id, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, collection_id, name, sort_order`,
      [collectionId, parsed.data.name, parsed.data.sortOrder]
    );
    const cat: TopicCategory = {
      id: rows[0].id as string,
      collectionId: rows[0].collection_id as string,
      name: rows[0].name as string,
      sortOrder: rows[0].sort_order as number,
      topics: [],
    };
    res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create category", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/topics/categories/:categoryId ─────────────────
const PatchCategorySchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

topicsRouter.patch("/categories/:categoryId", async (req: Request, res: Response) => {
  const parsed = PatchCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }
  const { categoryId } = req.params;
  const { name, sortOrder } = parsed.data;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (name !== undefined)      { fields.push(`name = $${i++}`);       values.push(name); }
  if (sortOrder !== undefined) { fields.push(`sort_order = $${i++}`); values.push(sortOrder); }
  if (fields.length === 0) { sendError(res, 422, "VALIDATION_ERROR", "Nothing to update", req.requestId); return; }

  try {
    values.push(categoryId);
    const { rows } = await pool.query(
      `UPDATE topic_categories SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, collection_id, name, sort_order`,
      values
    );
    if (rows.length === 0) { sendError(res, 404, "NOT_FOUND", "Category not found", req.requestId); return; }
    const cat: TopicCategory = {
      id: rows[0].id as string,
      collectionId: rows[0].collection_id as string,
      name: rows[0].name as string,
      sortOrder: rows[0].sort_order as number,
      topics: [],
    };
    res.json(cat);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update category", req.requestId);
  }
});

// ─── DELETE /projects/:projectId/topics/categories/:categoryId ────────────────
topicsRouter.delete("/categories/:categoryId", async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  try {
    const { rowCount } = await pool.query(`DELETE FROM topic_categories WHERE id = $1`, [categoryId]);
    if (!rowCount || rowCount === 0) { sendError(res, 404, "NOT_FOUND", "Category not found", req.requestId); return; }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete category", req.requestId);
  }
});

// ─── POST /projects/:projectId/topics/categories/:categoryId/topics ───────────
const CreateTopicSchema = z.object({
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

topicsRouter.post("/categories/:categoryId/topics", async (req: Request, res: Response) => {
  const parsed = CreateTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }
  const { categoryId } = req.params;
  try {
    const { rows } = await pool.query(
      `INSERT INTO topics (category_id, label, description, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_id, label, description, sentiment_enabled, sentiment_labels, sort_order`,
      [categoryId, parsed.data.label, parsed.data.description ?? null, parsed.data.sortOrder]
    );
    res.status(201).json(rowToTopic(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create topic", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/topics/topics/:topicId ────────────────────────
// GWT: "When user toggles sentiment enabled on topic
//       And at least one assignment has reviewed=true → CONFLICT"
const PatchTopicSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sentimentEnabled: z.boolean().optional(),
  sentimentLabels: z.record(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

topicsRouter.patch("/topics/:topicId", async (req: Request, res: Response) => {
  const parsed = PatchTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }

  const { topicId } = req.params;
  const { label, description, sentimentEnabled, sentimentLabels, sortOrder } = parsed.data;

  try {
    // GWT guard: block toggling sentiment on a topic once reviews exist
    if (sentimentEnabled === true) {
      const topicRow = await pool.query(
        `SELECT t.id, t.sentiment_enabled, tc.collection_id
         FROM topics t
         JOIN topic_categories tc ON tc.id = t.category_id
         WHERE t.id = $1`,
        [topicId]
      );
      if (topicRow.rows.length === 0) { sendError(res, 404, "NOT_FOUND", "Topic not found", req.requestId); return; }

      if (!(topicRow.rows[0].sentiment_enabled as boolean)) {
        const blocked = await hasReviewedAssignments(topicRow.rows[0].collection_id as string);
        if (blocked) {
          sendError(res, 409, "CONFLICT",
            "Sentiment cannot be enabled after reviews exist",
            req.requestId
          );
          return;
        }
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (label !== undefined)            { fields.push(`label = $${i++}`);             values.push(label); }
    if (description !== undefined)      { fields.push(`description = $${i++}`);        values.push(description); }
    if (sentimentEnabled !== undefined) { fields.push(`sentiment_enabled = $${i++}`);  values.push(sentimentEnabled); }
    if (sentimentLabels !== undefined)  { fields.push(`sentiment_labels = $${i++}`);   values.push(JSON.stringify(sentimentLabels)); }
    if (sortOrder !== undefined)        { fields.push(`sort_order = $${i++}`);         values.push(sortOrder); }

    if (fields.length === 0) { sendError(res, 422, "VALIDATION_ERROR", "Nothing to update", req.requestId); return; }

    values.push(topicId);
    const { rows } = await pool.query(
      `UPDATE topics SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, category_id, label, description, sentiment_enabled, sentiment_labels, sort_order`,
      values
    );
    if (rows.length === 0) { sendError(res, 404, "NOT_FOUND", "Topic not found", req.requestId); return; }
    res.json(rowToTopic(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update topic", req.requestId);
  }
});

// ─── DELETE /projects/:projectId/topics/topics/:topicId ───────────────────────
topicsRouter.delete("/topics/:topicId", async (req: Request, res: Response) => {
  const { topicId } = req.params;
  try {
    const { rowCount } = await pool.query(`DELETE FROM topics WHERE id = $1`, [topicId]);
    if (!rowCount || rowCount === 0) { sendError(res, 404, "NOT_FOUND", "Topic not found", req.requestId); return; }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete topic", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /projects/:projectId/topics/assignments ─────────────────────────────
const BulkAssignSchema = z.object({
  op: z.enum(["assign", "remove", "replace"]),
  rowIds: z.array(z.string().uuid()).min(1),
  topicIds: z.array(z.string().uuid()).min(1),
  sentiment: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
  source: z.enum(["ai", "human"]).default("human"),
});

topicsRouter.post("/assignments", async (req: Request, res: Response) => {
  const parsed = BulkAssignSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }

  const { projectId } = req.params;
  const { op, rowIds, topicIds, sentiment, source } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    let affected = 0;

    if (op === "assign") {
      for (const rowId of rowIds) {
        for (const topicId of topicIds) {
          const { rowCount } = await client.query(
            `INSERT INTO topic_assignments (project_id, row_id, topic_id, sentiment, source)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (row_id, topic_id) DO NOTHING`,
            [projectId, rowId, topicId, sentiment ?? null, source]
          );
          affected += rowCount ?? 0;
        }
      }
    } else if (op === "remove") {
      const { rowCount } = await client.query(
        `DELETE FROM topic_assignments
         WHERE project_id = $1
           AND row_id    = ANY($2::uuid[])
           AND topic_id  = ANY($3::uuid[])`,
        [projectId, rowIds, topicIds]
      );
      affected = rowCount ?? 0;
    } else {
      // replace: delete all current assignments for these rows, insert fresh ones
      await client.query(
        `DELETE FROM topic_assignments
         WHERE project_id = $1 AND row_id = ANY($2::uuid[])`,
        [projectId, rowIds]
      );
      for (const rowId of rowIds) {
        for (const topicId of topicIds) {
          await client.query(
            `INSERT INTO topic_assignments (project_id, row_id, topic_id, sentiment, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [projectId, rowId, topicId, sentiment ?? null, source]
          );
          affected++;
        }
      }
    }

    await client.query("COMMIT");
    res.json({ affected });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to apply bulk assignment", req.requestId);
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /projects/:projectId/topics/review ──────────────────────────────────
const BulkReviewSchema = z.object({
  rowIds: z.array(z.string().uuid()).min(1),
  reviewed: z.boolean(),
});

topicsRouter.post("/review", async (req: Request, res: Response) => {
  const parsed = BulkReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, { issues: parsed.error.issues });
    return;
  }

  const { projectId } = req.params;
  const { rowIds, reviewed } = parsed.data;

  try {
    const { rowCount } = await pool.query(
      `UPDATE topic_assignments
       SET reviewed = $1
       WHERE project_id = $2 AND row_id = ANY($3::uuid[])`,
      [reviewed, projectId, rowIds]
    );
    res.json({ affected: rowCount ?? 0 });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to bulk review", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMPUTE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /projects/:projectId/topics/collections/:collectionId/recompute ─────
topicsRouter.post("/collections/:collectionId/recompute", async (req: Request, res: Response) => {
  const { projectId, collectionId } = req.params;
  const rowIdsParsed = z.array(z.string().uuid()).optional().safeParse(req.body?.rowIds);

  try {
    const owns = await pool.query(
      `SELECT id FROM topic_collections WHERE id = $1 AND project_id = $2`,
      [collectionId, projectId]
    );
    if (owns.rows.length === 0) { sendError(res, 404, "NOT_FOUND", "Collection not found", req.requestId); return; }

    const job = await enqueueJob(projectId, "topic_recompute", {
      collectionId,
      rowIds: rowIdsParsed.success ? (rowIdsParsed.data ?? null) : null,
    });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue recompute", req.requestId);
  }
});
