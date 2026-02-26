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
  const { page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  try {
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
      id: r.id,
      projectId: r.project_id,
      rowIndex: r.row_index,
      textToAnalyze: r.text_to_analyze,
      auxValues: r.aux_values,
      translatedText: r.translated_text,
      duplicatesGroupKey: r.duplicates_group_key,
      createdAt: r.created_at.toISOString(),
    }));

    const body: PaginatedResponse<DatasetRow> = { items, page, pageSize, total };
    res.json(body);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list dataset rows", req.requestId);
  }
});
