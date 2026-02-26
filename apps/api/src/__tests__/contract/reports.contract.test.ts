/**
 * Contract: /api/projects/:projectId/reports/*
 *
 * GWT S1 — Create view as saved filters snapshot:
 *   POST /reports/:reportId/views → 201 { id, reportId, name, filters, segments, dateRange }
 *   The returned view.id is used as viewId in the URL state.
 *
 * GWT S2 — Preview vs Edit mode:
 *   PATCH /reports/:reportId { mode: "preview" } → report persists mode=preview
 *   PATCH /reports/:reportId/layout (when mode=preview) → 409 CONFLICT
 *   PATCH /reports/:reportId/layout (when mode=edit)    → 200 { sections }
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_REPORT_ID,
  FAKE_VIEW_ID,
  FAKE_SECTION_ID,
  FAKE_ELEMENT_ID,
  FAKE_TOKEN,
  dbReport,
  dbView,
  dbShareReport,
  NOW,
  expectErrorEnvelope,
  expectPaginatedShape,
} from "../helpers";

// ─── Pool mock ────────────────────────────────────────────────────────────────
const mockQuery       = vi.hoisted(() => vi.fn());
const mockClientQuery = vi.hoisted(() => vi.fn());
const mockRelease     = vi.hoisted(() => vi.fn());
const mockConnect     = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ query: mockClientQuery, release: mockRelease })
);

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH = { Authorization: `Bearer ${makeToken()}` };
const BASE = `/api/projects/${FAKE_PROJECT_ID}/reports`;

// ─── Local DB row fixtures ────────────────────────────────────────────────────
const dbReportPreview = { ...dbReport, mode: "preview" };

const dbSectionRow = {
  id: FAKE_SECTION_ID,
  report_id: FAKE_REPORT_ID,
  title: "Overview",
  sort_order: 0,
};

const dbElementRow = {
  id: FAKE_ELEMENT_ID,
  section_id: FAKE_SECTION_ID,
  type: "bar_chart",
  config: {},
  sort_order: 0,
};

// Section as returned by GET layout (json_agg includes elements)
const dbSectionAgg = {
  ...dbSectionRow,
  elements: [dbElementRow],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Reports CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /reports", () => {
  it("returns 200 with paginated report list including mode field", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbReport] });

    const res = await request(app).get(BASE).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: FAKE_REPORT_ID,
      projectId: FAKE_PROJECT_ID,
      name: "Q1 Analysis",
      mode: "edit",
    });
  });

  it("returns 200 with empty list when project has no reports", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(BASE).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

describe("POST /reports", () => {
  it("returns 201 with report shape (mode defaults to edit)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbReport] });

    const res = await request(app)
      .post(BASE)
      .set(AUTH)
      .send({ name: "Q1 Analysis" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_REPORT_ID,
      projectId: FAKE_PROJECT_ID,
      name: "Q1 Analysis",
      mode: "edit",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("returns 422 VALIDATION_ERROR when name is missing", async () => {
    const res = await request(app).post(BASE).set(AUTH).send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("returns 422 VALIDATION_ERROR when name is empty string", async () => {
    const res = await request(app).post(BASE).set(AUTH).send({ name: "" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

describe("GET /reports/:reportId", () => {
  it("returns 200 with single report including mode", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbReport] });

    const res = await request(app).get(`${BASE}/${FAKE_REPORT_ID}`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: FAKE_REPORT_ID, mode: "edit" });
  });

  it("returns 404 NOT_FOUND when report does not belong to project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/${FAKE_REPORT_ID}`).set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S2 — PATCH /reports/:reportId — mode switch
// ═══════════════════════════════════════════════════════════════════════════════
describe("GWT S2 — PATCH /reports/:reportId: persist mode switch", () => {
  it("returns 200 with mode=preview after switching to preview", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbReportPreview] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "preview" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("preview");
  });

  it("returns 200 with mode=edit after switching back to edit", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbReport] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "edit" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("edit");
  });

  it("returns 200 when updating name only (mode unchanged)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...dbReport, name: "Updated Name" }] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("returns 422 VALIDATION_ERROR when body is empty", async () => {
    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when mode value is invalid", async () => {
    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "read_only" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "preview" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S1 — POST /reports/:reportId/views — create view as URL-state snapshot
// ═══════════════════════════════════════════════════════════════════════════════
describe("GWT S1 — POST /reports/:reportId/views: save filters snapshot as ReportView", () => {
  const URL = `${BASE}/${FAKE_REPORT_ID}/views`;

  it("returns 201 with ReportView shape including view.id (used as viewId in URL)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbView] });

    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({
        name: "Region: EMEA",
        filters: [{ field: "region", op: "eq", value: "EMEA" }],
        segments: [],
        dateRange: null,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_VIEW_ID,          // ← this becomes viewId in the URL
      reportId: FAKE_REPORT_ID,
      name: "Region: EMEA",
      filters: expect.arrayContaining([
        expect.objectContaining({ field: "region", op: "eq", value: "EMEA" }),
      ]),
      segments: [],
      dateRange: null,
      sortOrder: 0,
    });
  });

  it("returns 201 with dateRange persisted when provided", async () => {
    const viewWithDate = {
      ...dbView,
      date_range: { from: "2026-01-01", to: "2026-03-31" },
    };
    mockQuery.mockResolvedValueOnce({ rows: [viewWithDate] });

    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({
        name: "Q1",
        filters: [],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
      });

    expect(res.status).toBe(201);
    expect(res.body.dateRange).toMatchObject({ from: "2026-01-01", to: "2026-03-31" });
  });

  it("returns 201 with empty filters and segments when omitted (defaults)", async () => {
    const emptyView = { ...dbView, filters: [], segments: [] };
    mockQuery.mockResolvedValueOnce({ rows: [emptyView] });

    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({ name: "All data" });

    expect(res.status).toBe(201);
    expect(res.body.filters).toEqual([]);
    expect(res.body.segments).toEqual([]);
  });

  it("returns 422 VALIDATION_ERROR when name is missing", async () => {
    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({ filters: [] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when filter op is invalid", async () => {
    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({
        name: "Bad filter",
        filters: [{ field: "region", op: "like", value: "EMEA" }],
      });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

describe("DELETE /reports/:reportId/views/:viewId", () => {
  it("returns 204 on success", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/views/${FAKE_VIEW_ID}`)
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when view does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/views/${FAKE_VIEW_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /reports/:reportId/layout
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /reports/:reportId/layout", () => {
  it("returns 200 with camelCase sections and views", async () => {
    // Promise.all fires 2 queries concurrently
    mockQuery
      .mockResolvedValueOnce({ rows: [dbSectionAgg] })   // sections query
      .mockResolvedValueOnce({ rows: [dbView] });          // views query

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/layout`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0]).toMatchObject({
      id: FAKE_SECTION_ID,
      reportId: FAKE_REPORT_ID,
      title: "Overview",
      sortOrder: 0,
      elements: expect.arrayContaining([
        expect.objectContaining({ id: FAKE_ELEMENT_ID, type: "bar_chart" }),
      ]),
    });
    expect(res.body.views).toHaveLength(1);
    expect(res.body.views[0]).toMatchObject({
      id: FAKE_VIEW_ID,
      reportId: FAKE_REPORT_ID,
      name: "Region: EMEA",
    });
  });

  it("returns 200 with empty sections and views when report has no content", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/layout`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.sections).toEqual([]);
    expect(res.body.views).toEqual([]);
  });

  it("returns 200 with section having no elements (json_agg returns null)", async () => {
    const sectionNoElements = { ...dbSectionRow, elements: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [sectionNoElements] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/layout`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.sections[0].elements).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S2 — PATCH /reports/:reportId/layout — autosave with mode guard
// ═══════════════════════════════════════════════════════════════════════════════
describe("GWT S2 — PATCH /reports/:reportId/layout: blocked in preview mode", () => {
  const URL = `${BASE}/${FAKE_REPORT_ID}/layout`;

  it("returns 409 CONFLICT when report is in preview mode", async () => {
    // Transaction: BEGIN → SELECT report (preview) → ROLLBACK
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID, mode: "preview" }] })         // SELECT report
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });                                   // ROLLBACK

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sections: [{ title: "Overview", sortOrder: 0, elements: [] }] });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
    expect(res.body.error.message).toMatch(/preview/i);
  });

  it("returns 200 with saved sections when report is in edit mode (autosave)", async () => {
    // Transaction: BEGIN → SELECT report (edit) → DELETE sections
    //              → INSERT section → INSERT element → COMMIT
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID, mode: "edit" }] })            // SELECT report
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                   // DELETE sections
      .mockResolvedValueOnce({ rows: [dbSectionRow] })                                    // INSERT section
      .mockResolvedValueOnce({ rows: [dbElementRow] })                                    // INSERT element
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });                                   // COMMIT

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({
        sections: [
          {
            title: "Overview",
            sortOrder: 0,
            elements: [{ type: "bar_chart", config: {}, sortOrder: 0 }],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0]).toMatchObject({
      id: FAKE_SECTION_ID,
      reportId: FAKE_REPORT_ID,
      title: "Overview",
      sortOrder: 0,
      elements: expect.arrayContaining([
        expect.objectContaining({ id: FAKE_ELEMENT_ID, type: "bar_chart" }),
      ]),
    });
  });

  it("returns 200 with empty sections when payload sections is empty (clear layout)", async () => {
    // BEGIN → SELECT report (edit) → DELETE sections → COMMIT  (no inserts)
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID, mode: "edit" }] })            // SELECT report
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                   // DELETE sections
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });                                   // COMMIT

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sections: [] });

    expect(res.status).toBe(200);
    expect(res.body.sections).toEqual([]);
  });

  it("returns 200 with empty sections when sections key is omitted (default)", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID, mode: "edit" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.sections).toEqual([]);
  });

  it("returns 404 NOT_FOUND when report does not belong to project", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // BEGIN
      .mockResolvedValueOnce({ rows: [] })                  // SELECT report → empty
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });   // ROLLBACK

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sections: [] });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Share settings
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /reports/:reportId/share", () => {
  it("returns 200 with share settings for existing report", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbShareReport] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      reportId: FAKE_REPORT_ID,
      shareEnabled: true,
      shareToken: FAKE_TOKEN,
      passwordEnabled: false,
    });
  });

  it("returns 404 NOT_FOUND when report does not belong to project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("POST /reports/:reportId/share", () => {
  it("returns 201 with share settings after enabling sharing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbShareReport] });

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      reportId: FAKE_REPORT_ID,
      shareEnabled: true,
      passwordEnabled: false,
    });
    expect(typeof res.body.shareToken).toBe("string");
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});
