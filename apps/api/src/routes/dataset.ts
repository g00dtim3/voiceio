import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { DatasetRow, Filter, PaginatedResponse } from "../types";

export const datasetRouter = Router({ mergeParams: true });

const ListRowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  q: z.string().optional(),
  // GWT: focus=1 → only non-reviewed rows, sorted by lowest AI confidence first
  focus: z.coerce.number().int().min(0).max(1).default(0),
  // collectionId is required when focus=1 (scopes which assignments to inspect)
  collectionId: z.string().uuid().optional(),
  // filters is a JSON-encoded Filter[] string
  filters: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return [] as Filter[];
      try {
        return JSON.parse(v) as Filter[];
      } catch {
        return [] as Filter[];
      }
    }),
});

// GET /projects/:projectId/dataset/rows
datasetRouter.get("/rows", async (req: Request, res: Response) => {
  const parsed = ListRowsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid query parameters", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { page, pageSize, focus, collectionId } = parsed.data;
  const offset = (page - 1) * pageSize;

  // GWT: "When user enables focus=1
  //       Then only non-reviewed rows are listed
  //       And sorted by lowest confidence first"
  if (focus === 1 && !collectionId) {
    sendError(res, 422, "VALIDATION_ERROR", "collectionId is required when focus=1", req.requestId);
    return;
  }

  try {
    if (focus === 1 && collectionId) {
      // Focus mode: rows with at least one unreviewed assignment in the given collection,
      // ordered by MIN(confidence) ASC so lowest-confidence rows surface first.
      const countRow = await pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT dr.id)::text
         FROM dataset_rows dr
         JOIN topic_assignments ta ON ta.row_id = dr.id AND ta.reviewed = false
         JOIN topics t              ON t.id  = ta.topic_id
         JOIN topic_categories tc   ON tc.id = t.category_id
         WHERE dr.project_id = $1
           AND tc.collection_id = $2`,
        [projectId, collectionId]
      );
      const total = parseInt(countRow.rows[0].count, 10);

      const { rows } = await pool.query(
        `SELECT dr.id, dr.project_id, dr.row_index, dr.text_to_analyze,
                dr.aux_values, dr.translated_text, dr.duplicates_group_key,
                dr.created_at
         FROM dataset_rows dr
         JOIN topic_assignments ta ON ta.row_id = dr.id AND ta.reviewed = false
         JOIN topics t              ON t.id  = ta.topic_id
         JOIN topic_categories tc   ON tc.id = t.category_id
         WHERE dr.project_id = $1
           AND tc.collection_id = $2
         GROUP BY dr.id
         ORDER BY MIN(ta.confidence) ASC NULLS LAST, dr.row_index ASC
         LIMIT $3 OFFSET $4`,
        [projectId, collectionId, pageSize, offset]
      );

      const items: DatasetRow[] = rows.map((r) => ({
        id: r.id as string,
        projectId: r.project_id as string,
        rowIndex: r.row_index as number,
        textToAnalyze: r.text_to_analyze as Record<string, string>,
        auxValues: r.aux_values as Record<string, unknown>,
        translatedText: r.translated_text as Record<string, string>,
        duplicatesGroupKey: (r.duplicates_group_key as string) ?? null,
        createdAt: (r.created_at as Date).toISOString(),
      }));

      const body: PaginatedResponse<DatasetRow> = { items, page, pageSize, total };
      res.json(body);
      return;
    }

    // Standard listing (no focus)
    const countRow = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text FROM dataset_rows WHERE project_id = $1",
      [projectId]
    );
    const total = parseInt(countRow.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT id, project_id, row_index, text_to_analyze, aux_values,
              translated_text, duplicates_group_key, created_at
       FROM dataset_rows
       WHERE project_id = $1
       ORDER BY row_index ASC
       LIMIT $2 OFFSET $3`,
      [projectId, pageSize, offset]
    );

    const items: DatasetRow[] = rows.map((r) => ({
      id: r.id as string,
      projectId: r.project_id as string,
      rowIndex: r.row_index as number,
      textToAnalyze: r.text_to_analyze as Record<string, string>,
      auxValues: r.aux_values as Record<string, unknown>,
      translatedText: r.translated_text as Record<string, string>,
      duplicatesGroupKey: (r.duplicates_group_key as string) ?? null,
      createdAt: (r.created_at as Date).toISOString(),
    }));

    const body: PaginatedResponse<DatasetRow> = { items, page, pageSize, total };
    res.json(body);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list dataset rows", req.requestId);
  }
});
