import express from "express";
import { requestId } from "./middleware/requestId";
import { requireAuth } from "./middleware/auth";
import { globalErrorHandler } from "./middleware/errorHandler";
import { projectsRouter } from "./routes/projects";
import { datasetRouter } from "./routes/dataset";
import { topicsRouter } from "./routes/topics";
import { smartColumnsRouter } from "./routes/smartColumns";
import { reportsRouter } from "./routes/reports";
import { insightAgentRouter } from "./routes/insightAgent";
import { jobsRouter } from "./routes/jobs";

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(requestId);

// ─── Health check (no auth) ───────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Authenticated routes ─────────────────────────────────────────────────────
app.use("/api", requireAuth);

app.use("/api/projects", projectsRouter);

// Per-project sub-resources
app.use("/api/projects/:projectId/dataset", datasetRouter);
app.use("/api/projects/:projectId/topics", topicsRouter);
app.use("/api/projects/:projectId/smart-columns", smartColumnsRouter);
app.use("/api/projects/:projectId/reports", reportsRouter);
app.use("/api/projects/:projectId/insight-agent", insightAgentRouter);
app.use("/api/projects/:projectId/jobs", jobsRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export { app };
