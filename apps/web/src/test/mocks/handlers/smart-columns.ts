import { http, HttpResponse } from "msw";
import smartColumnsList from "../../fixtures/smart-columns/smart-columns.list.success.json";
import smartColumnDetail from "../../fixtures/smart-columns/smart-column.detail.llm.json";
import smartColumnPreview from "../../fixtures/smart-columns/smart-column.preview.success.json";
import smartColumnJob from "../../fixtures/smart-columns/smart-column.compute.job.json";

export const smartColumnsHandlers = [
  http.get("/api/v1/projects/:projectId/smart-columns", () => {
    return HttpResponse.json(smartColumnsList);
  }),

  http.get("/api/v1/projects/:projectId/smart-columns/:smartColumnId", () => {
    return HttpResponse.json(smartColumnDetail);
  }),

  http.post("/api/v1/projects/:projectId/smart-columns", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: `sc_${Date.now()}`, status: "draft", ...body as object });
  }),

  http.post("/api/v1/projects/:projectId/smart-columns/:smartColumnId/preview", () => {
    return HttpResponse.json(smartColumnPreview);
  }),

  http.post("/api/v1/projects/:projectId/smart-columns/:smartColumnId/compute", () => {
    return HttpResponse.json(smartColumnJob);
  }),

  http.post("/api/v1/projects/:projectId/smart-columns/:smartColumnId/reapply", () => {
    return HttpResponse.json(smartColumnJob);
  }),

  http.delete("/api/v1/projects/:projectId/smart-columns/:smartColumnId", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
