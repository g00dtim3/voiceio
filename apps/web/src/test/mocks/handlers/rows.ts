import { http, HttpResponse } from "msw";
import rowsSuccess from "../../fixtures/rows/rows.list.success.json";
import rowsEmpty from "../../fixtures/rows/rows.list.empty.json";

export const rowsHandlers = [
  http.get("/api/v1/projects/:projectId/rows", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search");

    if (search === "__empty__") {
      return HttpResponse.json(rowsEmpty);
    }

    return HttpResponse.json(rowsSuccess);
  }),

  http.patch("/api/v1/projects/:projectId/rows/review", async ({ request }) => {
    const body = (await request.json()) as { rowIds: string[]; reviewed: boolean };
    return HttpResponse.json({ updatedCount: body.rowIds.length });
  }),
];
