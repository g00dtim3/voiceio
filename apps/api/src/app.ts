import express from "express";
import { requestId } from "./middleware/requestId";
import { requireAuth } from "./middleware/auth";
import { requireReportEditPermission } from "./middleware/reportPermission";
import { globalErrorHandler } from "./middleware/errorHandler";
import { projectsRouter } from "./routes/projects";
import { datasetRouter } from "./routes/dataset";
import { topicsRouter } from "./routes/topics";
import { smartColumnsRouter } from "./routes/smartColumns";
import { reportsRouter } from "./routes/reports";
import { insightAgentRouter } from "./routes/insightAgent";
import { jobsRouter } from "./routes/jobs";
import { publicShareRouter, sharingRouter } from "./routes/sharing";

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(requestId);

// ─── Health check (no auth) ───────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Public share link (no auth) ─────────────────────────────────────────────
// GWT S1: /r/:token serves the report in read-only mode without authentication
app.use("/r", publicShareRouter);

// ─── Authenticated routes ─────────────────────────────────────────────────────
app.use("/api", requireAuth);

app.use("/api/projects", projectsRouter);

// Per-project sub-resources
app.use("/api/projects/:projectId/dataset", datasetRouter);
app.use("/api/projects/:projectId/topics", topicsRouter);
app.use("/api/projects/:projectId/smart-columns", smartColumnsRouter);

// GWT S2: PATCH layout requires explicit edit permission for viewer-role users
app.patch(
  "/api/projects/:projectId/reports/:reportId/layout",
  requireReportEditPermission
);

// sharingRouter must be mounted BEFORE reportsRouter so that
// /:reportId/share and /:reportId/permissions routes take precedence
// over any same-path stubs in the legacy reports router.
app.use("/api/projects/:projectId/reports", sharingRouter);
app.use("/api/projects/:projectId/reports", reportsRouter);
app.use("/api/projects/:projectId/insight-agent", insightAgentRouter);
app.use("/api/projects/:projectId/jobs", jobsRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export { app };
