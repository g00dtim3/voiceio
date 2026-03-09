import { http, HttpResponse } from "msw";
import reportDetail from "../../fixtures/reports/report.detail.success.json";

export const reportsHandlers = [
  http.get("/api/v1/projects/:projectId/reports/:reportId", () => {
    return HttpResponse.json(reportDetail);
  }),

  http.post("/api/v1/projects/:projectId/reports", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      id: `rep_${Date.now()}`,
      name: body.name,
      views: [],
      sections: [],
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post("/api/v1/projects/:projectId/reports/:reportId/sections", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      id: `sec_${Date.now()}`,
      name: body.name,
      order: 99,
      elements: [],
    });
  }),

  http.post("/api/v1/projects/:projectId/reports/:reportId/sections/:sectionId/elements", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: `el_${Date.now()}`,
      order: 99,
      ...body as object,
    });
  }),

  http.patch("/api/v1/projects/:projectId/reports/:reportId/layout", () => {
    return HttpResponse.json({ ok: true });
  }),

  http.patch("/api/v1/projects/:projectId/reports/:reportId/elements/:elementId", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  http.delete("/api/v1/projects/:projectId/reports/:reportId/elements/:elementId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/projects/:projectId/reports/:reportId/views", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: `view_${Date.now()}`, ...body as object });
  }),
];
