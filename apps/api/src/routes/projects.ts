import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { PaginatedResponse, Project } from "../types";

export const projectsRouter = Router();

// GET /projects
projectsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<{ id: string; name: string; created_at: Date }>(
      "SELECT id, name, created_at FROM projects ORDER BY created_at DESC"
    );
    const items: Project[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at.toISOString(),
    }));
    const body: PaginatedResponse<Project> = { items, page: 1, pageSize: items.length, total: items.length };
    res.json(body);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list projects", req.requestId);
  }
});

// POST /projects
const CreateProjectSchema = z.object({ name: z.string().min(1) });

projectsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  try {
    const { rows } = await pool.query<{ id: string; name: string; created_at: Date }>(
      "INSERT INTO projects (name) VALUES ($1) RETURNING id, name, created_at",
      [parsed.data.name]
    );
    const project: Project = {
      id: rows[0].id,
      name: rows[0].name,
      createdAt: rows[0].created_at.toISOString(),
    };
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create project", req.requestId);
  }
});
