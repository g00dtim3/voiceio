import { http, HttpResponse } from "msw";
import topicCollection from "../../fixtures/topics/topic-collection.success.json";
import topicGenerate from "../../fixtures/topics/topic-generate.completed.json";
import qualityScore from "../../fixtures/topics/quality-score.success.json";

export const topicsHandlers = [
  http.get("/api/v1/projects/:projectId/topics/collections/:collectionId", () => {
    return HttpResponse.json(topicCollection);
  }),

  http.post("/api/v1/projects/:projectId/topics/collections/:collectionId/categories", async ({ request }) => {
    const body = (await request.json()) as { label: string };
    return HttpResponse.json({
      id: `cat_${Date.now()}`,
      label: body.label,
      order: 99,
      topics: [],
    });
  }),

  http.post("/api/v1/projects/:projectId/topics/categories/:categoryId/topics", async ({ request }) => {
    const body = (await request.json()) as { label: string; description?: string; sentimentEnabled?: boolean };
    return HttpResponse.json({
      id: `topic_${Date.now()}`,
      ...body,
      order: 99,
    });
  }),

  http.patch("/api/v1/projects/:projectId/topics/topics/:topicId", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  http.delete("/api/v1/projects/:projectId/topics/topics/:topicId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/projects/:projectId/topics/assignments", async ({ request }) => {
    const body = (await request.json()) as { rowIds: string[] };
    return HttpResponse.json({ updatedCount: body.rowIds.length });
  }),

  http.post("/api/v1/projects/:projectId/topics/generate", () => {
    return HttpResponse.json({
      id: "job_gen_1",
      type: "topic_generation",
      status: "running",
      progress: 0,
      rowsAffected: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.get("/api/v1/projects/:projectId/topics/generate/:jobId", () => {
    return HttpResponse.json(topicGenerate);
  }),

  http.get("/api/v1/projects/:projectId/topics/quality-score", () => {
    return HttpResponse.json(qualityScore);
  }),
];
