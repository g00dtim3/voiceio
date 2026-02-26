import { Router, Request, Response } from "express";
import { z } from "zod";
import { sendError } from "../middleware/errorHandler";
import { enqueueJob } from "./jobs";

export const insightAgentRouter = Router({ mergeParams: true });

const AskSchema = z.object({
  question: z.string().min(1),
  viewId: z.string().uuid().optional(),
  filters: z.array(z.unknown()).default([]),
});

// POST /projects/:projectId/insight-agent/ask
insightAgentRouter.post("/ask", async (req: Request, res: Response) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  try {
    const job = await enqueueJob(projectId, "insight_agent_ask", {
      question: parsed.data.question,
      viewId: parsed.data.viewId ?? null,
      filters: parsed.data.filters,
    });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue insight agent job", req.requestId);
  }
});
