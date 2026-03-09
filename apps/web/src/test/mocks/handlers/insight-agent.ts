import { http, HttpResponse } from "msw";
import insightSuccess from "../../fixtures/insight-agent/insight.query.success.json";

export const insightAgentHandlers = [
  http.post("/api/v1/projects/:projectId/insight-agent/query", () => {
    return HttpResponse.json(insightSuccess);
  }),

  http.get("/api/v1/projects/:projectId/insight-agent/history", () => {
    return HttpResponse.json({
      items: [insightSuccess],
      meta: { page: 1, pageSize: 10, total: 1 },
    });
  }),
];
