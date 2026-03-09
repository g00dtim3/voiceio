import { http, HttpResponse } from "msw";
import shareSettings from "../../fixtures/reports/share.settings.success.json";

export const sharingHandlers = [
  http.get("/api/v1/projects/:projectId/reports/:reportId/sharing", () => {
    return HttpResponse.json(shareSettings);
  }),

  http.patch("/api/v1/projects/:projectId/reports/:reportId/sharing", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...shareSettings, ...body as object });
  }),

  http.post("/api/v1/projects/:projectId/reports/:reportId/sharing/invite", async ({ request }) => {
    const body = (await request.json()) as { email: string; role: string };
    return HttpResponse.json({
      email: body.email,
      role: body.role,
      status: "pending",
    });
  }),

  http.delete("/api/v1/projects/:projectId/reports/:reportId/sharing/members/:memberId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/shared/:shareToken", () => {
    return HttpResponse.json({
      report: {
        id: "rep_shared_001",
        name: "Shared Q4 Report",
        sections: [],
      },
    });
  }),
];
