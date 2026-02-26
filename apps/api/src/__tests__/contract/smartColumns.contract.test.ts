/**
 * Contract: /api/projects/:projectId/smart-columns/*
 *
 * GWT S1 — LLM smart column preview and fill:
 *   POST /:id/preview  → 202 job(type=smart_column_preview)   [existence guard]
 *   GET  /:id/preview  → 200 { items: SmartColumnValue[] }    [sample values]
 *   POST /:id/fill { mode:"all" } → 202 job(type=smart_column_fill)
 *                                 + status immediately updated to "running"
 *
 * GWT S2 — Reapply scopes:
 *   PATCH /:id { status:"outdated" } → 200, status=outdated   [system transition]
 *   POST  /:id/fill { mode:"outdated" } → 202                 [Reapply]
 *   POST  /:id/fill { mode:"future"  } → 202                  [future uploads]
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_SC_ID,
  FAKE_ROW_ID,
  FAKE_JOB_ID,
  dbSmartColumn,
  dbSmartColumnValue,
  dbJob,
  expectErrorEnvelope,
  expectJobShape,
  expectPaginatedShape,
} from "../helpers";

// ─── Pool mock ────────────────────────────────────────────────────────────────
const mockQuery   = vi.hoisted(() => vi.fn());
const mockRelease = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ query: vi.fn(), release: mockRelease })
);

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH = { Authorization: `Bearer ${makeToken()}` };
const BASE = `/api/projects/${FAKE_PROJECT_ID}/smart-columns`;

const dbJobPreview = { ...dbJob, type: "smart_column_preview" };
const dbJobFill    = { ...dbJob, type: "smart_column_fill"    };

// Helper: enqueueJob mock (dedupe check → no match → INSERT)
function mockEnqueueJob(jobRow: typeof dbJob): void {
  mockQuery
    .mockResolvedValueOnce({ rows: [] })          // dedupe SELECT → no existing job
    .mockResolvedValueOnce({ rows: [jobRow] });    // INSERT INTO jobs RETURNING
}

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockResolvedValue({ query: vi.fn(), release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
// List + Create
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /smart-columns", () => {
  it("returns 200 with paginated list including status field", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSmartColumn] });

    const res = await request(app).get(BASE).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: FAKE_SC_ID,
      projectId: FAKE_PROJECT_ID,
      name: "Sentiment Score",
      outputType: "text",
      computeType: "llm",
      status: "draft",
    });
  });

  it("returns 200 with empty list when no columns exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(BASE).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

describe("POST /smart-columns", () => {
  it("returns 201 with SmartColumn shape (status defaults to draft)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSmartColumn] });

    const res = await request(app)
      .post(BASE)
      .set(AUTH)
      .send({
        name: "Sentiment Score",
        outputType: "text",
        computeType: "llm",
        sourceColumns: ["col_feedback"],
        config: { prompt: "Classify the sentiment." },
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_SC_ID,
      name: "Sentiment Score",
      computeType: "llm",
      status: "draft",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("returns 422 VALIDATION_ERROR when name is missing", async () => {
    const res = await request(app)
      .post(BASE)
      .set(AUTH)
      .send({ outputType: "text", computeType: "llm" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("returns 422 VALIDATION_ERROR when outputType is invalid", async () => {
    const res = await request(app)
      .post(BASE)
      .set(AUTH)
      .send({ name: "Test", outputType: "blob", computeType: "llm" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when computeType is invalid", async () => {
    const res = await request(app)
      .post(BASE)
      .set(AUTH)
      .send({ name: "Test", outputType: "text", computeType: "gpt" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Single column GET / PATCH / DELETE
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /smart-columns/:smartColumnId", () => {
  it("returns 200 with SmartColumn shape", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSmartColumn] });

    const res = await request(app).get(`${BASE}/${FAKE_SC_ID}`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: FAKE_SC_ID,
      projectId: FAKE_PROJECT_ID,
      status: "draft",
    });
  });

  it("returns 404 NOT_FOUND when column does not exist or wrong project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/${FAKE_SC_ID}`).set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("PATCH /smart-columns/:smartColumnId", () => {
  it("returns 200 with updated name", async () => {
    const updated = { ...dbSmartColumn, name: "New Name" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });

  it("returns 200 with updated config", async () => {
    const updated = { ...dbSmartColumn, config: { prompt: "New prompt" } };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({ config: { prompt: "New prompt" } });

    expect(res.status).toBe(200);
  });

  it("returns 422 VALIDATION_ERROR when body is empty", async () => {
    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when status value is invalid", async () => {
    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({ status: "pending" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND when column does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("DELETE /smart-columns/:smartColumnId", () => {
  it("returns 204 on success", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete(`${BASE}/${FAKE_SC_ID}`).set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when column does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete(`${BASE}/${FAKE_SC_ID}`).set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S1 — Preview: enqueue job + fetch computed sample
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT S1 — POST /:id/preview: enqueue SMART_COLUMN_PREVIEW", () => {
  it("returns 202 with smart_column_preview job when column exists", async () => {
    // existence check → enqueueJob (dedupe + insert)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] })  // existence check
    mockEnqueueJob(dbJobPreview);

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/preview`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("smart_column_preview");
    expect(res.body.status).toBe("queued");
  });

  it("returns 404 NOT_FOUND when column does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // existence check → miss

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/preview`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });

  it("returns deduplicated job when same preview is already queued", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] })  // existence check
      .mockResolvedValueOnce({ rows: [dbJobPreview] });         // enqueueJob: dedup match → return existing

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/preview`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });
});

describe("GWT S1 — GET /:id/preview: fetch computed sample values", () => {
  it("returns 200 with sample SmartColumnValue items after preview job completes", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSmartColumnValue] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_SC_ID}/preview`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      rowId: FAKE_ROW_ID,
      smartColumnId: FAKE_SC_ID,
      value: "positive",
      confidence: 0.95,
      computedAt: expect.any(String),
    });
  });

  it("returns 200 with empty items when no values have been computed yet", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_SC_ID}/preview`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S1 — Fill: enqueue job + update column status to "running"
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT S1 — POST /:id/fill: Create & fill (scope=all)", () => {
  it("returns 202 with smart_column_fill job and column status updated to running", async () => {
    // existence check → enqueueJob × 2 → UPDATE status='running'
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] }); // existence check
    mockEnqueueJob(dbJobFill);
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });           // UPDATE status='running'

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "all" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("smart_column_fill");
    expect(res.body.status).toBe("queued");
  });

  it("defaults mode to outdated when mode is omitted", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] });
    mockEnqueueJob(dbJobFill);
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });

  it("returns 422 VALIDATION_ERROR when mode is invalid", async () => {
    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "partial" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND when column does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // existence check → miss

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "all" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S2 — Reapply scopes: outdated → reapply / future uploads
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT S2 — PATCH /:id { status:outdated }: system marks column as outdated", () => {
  it("returns 200 with status=outdated after system transition", async () => {
    const outdated = { ...dbSmartColumn, status: "outdated" };
    mockQuery.mockResolvedValueOnce({ rows: [outdated] });

    const res = await request(app)
      .patch(`${BASE}/${FAKE_SC_ID}`)
      .set(AUTH)
      .send({ status: "outdated" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("outdated");
    expect(res.body.id).toBe(FAKE_SC_ID);
  });
});

describe("GWT S2 — POST /:id/fill mode=outdated: Reapply to outdated rows", () => {
  it("returns 202 for mode=outdated (Reapply)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] });
    mockEnqueueJob(dbJobFill);
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "outdated" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });

  it("returns 202 for mode=future (Apply to future uploads)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] });
    mockEnqueueJob(dbJobFill);
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post(`${BASE}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "future" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });
});
