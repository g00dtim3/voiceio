/**
 * Contract: /api/projects/:projectId/topics/*
 *
 * Covers the three GWT scenarios from 06_DOMAINS/topics/GWT.md plus
 * all CRUD endpoints and their error contracts.
 *
 * GWT S1 — Start analysis from scratch:
 *   POST /collections → 202 { collection, job }
 *
 * GWT S2 — Block sentiment after reviews exist:
 *   PATCH /collections/:id { sentimentEnabled:true } → 409 CONFLICT
 *   PATCH /topics/:id      { sentimentEnabled:true } → 409 CONFLICT
 *   POST  /collections (re-trigger, enableSentiment)  → 409 CONFLICT
 *
 * GWT S3 — Focus mode: tested in dataset.contract.test.ts
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID, FAKE_COL_ID, FAKE_CAT_ID, FAKE_TOPIC_ID, FAKE_ROW_ID, FAKE_JOB_ID,
  dbCollection, dbCategory, dbTopic, dbJob,
  expectErrorEnvelope,
  expectJobShape,
  NOW,
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
const BASE = `/api/projects/${FAKE_PROJECT_ID}/topics`;

// Helper for 2-query enqueueJob (dedupe check → INSERT)
function mockEnqueueJob(): void {
  mockQuery
    .mockResolvedValueOnce({ rows: [] })        // no existing job with dedupeKey
    .mockResolvedValueOnce({ rows: [dbJob] });  // INSERT INTO jobs
}

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT Scenario 1 — Start analysis from scratch
// ═══════════════════════════════════════════════════════════════════════════════
describe("GWT S1 — POST /collections: start analysis from scratch", () => {
  it("returns 202 with { collection, job } shape on valid body", async () => {
    // Query order: check existing col → upsert col → enqueueJob × 2
    mockQuery
      .mockResolvedValueOnce({ rows: [] })          // no existing collection
      .mockResolvedValueOnce({ rows: [dbCollection] }); // upsert RETURNING
    mockEnqueueJob();

    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "col_feedback", startMode: "scratch", enableSentiment: false });

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty("collection");
    expect(res.body).toHaveProperty("job");
    expect(res.body.collection).toMatchObject({
      id: FAKE_COL_ID,
      projectId: FAKE_PROJECT_ID,
      textColumnId: "col_feedback",
      sentimentEnabled: false,
      createdAt: expect.any(String),
    });
    expectJobShape(res.body.job);
    expect(res.body.job.status).toBe("queued");
  });

  it("job.type is topic_generation", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [dbCollection] });
    mockEnqueueJob();

    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "col_feedback", startMode: "scratch", enableSentiment: false });

    expect(res.body.job.type).toBe("topic_generation");
  });

  it("returns 422 VALIDATION_ERROR when textColumnId is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ startMode: "scratch", enableSentiment: false });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("returns 422 VALIDATION_ERROR when startMode is invalid", async () => {
    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "x", startMode: "unknown_mode", enableSentiment: false });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns deduplicated job when same collection is submitted again (idempotency)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })           // no existing collection
      .mockResolvedValueOnce({ rows: [dbCollection] }) // upsert
      .mockResolvedValueOnce({ rows: [dbJob] });      // existing job found by dedupeKey → returned

    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "col_feedback", startMode: "scratch", enableSentiment: false });

    expect(res.status).toBe(202);
    expectJobShape(res.body.job);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT Scenario 2 — Block sentiment activation after reviews exist
// ═══════════════════════════════════════════════════════════════════════════════
describe("GWT S2 — PATCH /collections/:id: CONFLICT when reviews exist", () => {
  const URL = `${BASE}/collections/${FAKE_COL_ID}`;

  it("returns 409 CONFLICT when enabling sentiment after reviews exist", async () => {
    // Query 1: fetch collection (sentiment_enabled=false)
    // Query 2: hasReviewedAssignments → rows non-empty
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] })
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // reviewed assignments exist

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
    expect(res.body.error.message).toMatch(/sentiment/i);
  });

  it("returns 200 when enabling sentiment and no reviews exist yet", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] })
      .mockResolvedValueOnce({ rows: [] })              // no reviewed assignments
      .mockResolvedValueOnce({ rows: [{ ...dbCollection, sentiment_enabled: true }] }); // UPDATE

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(200);
    expect(res.body.sentimentEnabled).toBe(true);
  });

  it("returns 200 when disabling sentiment (no review guard needed)", async () => {
    // Disabling sentiment doesn't trigger the guard
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: true }] })
      .mockResolvedValueOnce({ rows: [{ ...dbCollection, sentiment_enabled: false }] }); // UPDATE

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sentimentEnabled: false });

    expect(res.status).toBe(200);
  });

  it("returns 404 NOT_FOUND when collection does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no collection

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ language: "fr" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });

  it("returns 422 VALIDATION_ERROR when body is empty", async () => {
    // "Nothing to update"
    mockQuery.mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] });

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

describe("GWT S2 — PATCH /topics/:id: CONFLICT when reviews exist", () => {
  const URL = `${BASE}/topics/${FAKE_TOPIC_ID}`;

  it("returns 409 CONFLICT when enabling sentiment on topic after reviews exist", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_TOPIC_ID, sentiment_enabled: false, collection_id: FAKE_COL_ID }] })
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // reviewed assignments exist

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
  });

  it("returns 200 when enabling sentiment on topic with no reviews", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_TOPIC_ID, sentiment_enabled: false, collection_id: FAKE_COL_ID }] })
      .mockResolvedValueOnce({ rows: [] })       // no reviews
      .mockResolvedValueOnce({ rows: [dbTopic] }); // UPDATE

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(200);
  });

  it("returns 404 when topic not found", async () => {
    // sentimentEnabled is NOT true, so no guard check → goes straight to UPDATE
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE returns empty

    const res = await request(app)
      .patch(URL)
      .set(AUTH)
      .send({ label: "New Label" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("GWT S2 — POST /collections: CONFLICT when re-triggering with enableSentiment", () => {
  it("returns 409 CONFLICT when enabling sentiment on existing collection with reviews", async () => {
    // existing collection found, sentiment_enabled=false → check reviews → blocked
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] }) // existing col
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });                             // reviews exist

    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "col_feedback", startMode: "scratch", enableSentiment: true });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Collections CRUD
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /collections", () => {
  it("returns 200 with paginated collection list", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbCollection] });

    const res = await request(app).get(`${BASE}/collections`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ id: FAKE_COL_ID, textColumnId: "col_feedback" });
  });
});

describe("GET /collections/:id", () => {
  it("returns 200 with collection + generationJob snapshot", async () => {
    // Promise.all: 2 concurrent queries
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [{ id: FAKE_JOB_ID, status: "queued", progress: 0, error: null, updated_at: NOW }] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: FAKE_COL_ID, generationJob: expect.objectContaining({ id: FAKE_JOB_ID, status: "queued" }) });
  });

  it("returns 200 with generationJob=null when no job exists yet", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [] });            // no job

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.generationJob).toBeNull();
  });

  it("returns 404 NOT_FOUND when collection does not belong to project", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ─── Categories ───────────────────────────────────────────────────────────────
describe("GET /collections/:id/categories", () => {
  it("returns 200 with taxonomy tree (categories + topics + counts)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] })   // owns check
      .mockResolvedValueOnce({ rows: [dbCategory] })              // categories
      .mockResolvedValueOnce({ rows: [dbTopic] });                // topics

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: FAKE_CAT_ID,
      name: "Generated",
      topics: expect.arrayContaining([expect.objectContaining({ id: FAKE_TOPIC_ID, label: "Product Quality" })]),
    });
  });

  it("returns 200 with empty items when no categories exist yet", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("returns 404 NOT_FOUND when collection does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("POST /collections/:id/categories", () => {
  it("returns 201 with category shape", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] })
      .mockResolvedValueOnce({ rows: [dbCategory] });

    const res = await request(app)
      .post(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH)
      .send({ name: "Generated" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: FAKE_CAT_ID, name: "Generated", topics: [] });
  });

  it("returns 422 VALIDATION_ERROR when name is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

describe("DELETE /categories/:id", () => {
  it("returns 204 on success", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .delete(`${BASE}/categories/${FAKE_CAT_ID}`)
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when category does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete(`${BASE}/categories/${FAKE_CAT_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("POST /categories/:id/topics", () => {
  it("returns 201 with topic shape", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbTopic] });

    const res = await request(app)
      .post(`${BASE}/categories/${FAKE_CAT_ID}/topics`)
      .set(AUTH)
      .send({ label: "Product Quality" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: FAKE_TOPIC_ID, label: "Product Quality", sentimentEnabled: false });
  });

  it("returns 422 VALIDATION_ERROR when label is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/categories/${FAKE_CAT_ID}/topics`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

describe("DELETE /topics/:id", () => {
  it("returns 204 on success", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .delete(`${BASE}/topics/${FAKE_TOPIC_ID}`)
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when topic does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete(`${BASE}/topics/${FAKE_TOPIC_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ─── Assignments ──────────────────────────────────────────────────────────────
describe("POST /assignments", () => {
  const payload = { op: "assign", rowIds: [FAKE_ROW_ID], topicIds: [FAKE_TOPIC_ID] };

  it("returns 200 with { affected } on assign op", async () => {
    // Transaction: BEGIN → INSERT → COMMIT
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })   // INSERT (1 assignment)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: expect.any(Number) });
  });

  it("returns 200 with { affected } on remove op", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })   // DELETE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send({ op: "remove", rowIds: [FAKE_ROW_ID], topicIds: [FAKE_TOPIC_ID] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("affected");
  });

  it("returns 422 VALIDATION_ERROR when op is invalid", async () => {
    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send({ op: "upsert", rowIds: [FAKE_ROW_ID], topicIds: [FAKE_TOPIC_ID] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when rowIds is empty", async () => {
    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send({ op: "assign", rowIds: [], topicIds: [FAKE_TOPIC_ID] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when rowIds contains non-UUID", async () => {
    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send({ op: "assign", rowIds: ["not-a-uuid"], topicIds: [FAKE_TOPIC_ID] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

// ─── Review ───────────────────────────────────────────────────────────────────
describe("POST /review", () => {
  it("returns 200 with { affected } when marking rows as reviewed", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });

    const res = await request(app)
      .post(`${BASE}/review`)
      .set(AUTH)
      .send({ rowIds: [FAKE_ROW_ID], reviewed: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: 3 });
  });

  it("returns 422 VALIDATION_ERROR when rowIds is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/review`)
      .set(AUTH)
      .send({ reviewed: true });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when reviewed field is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/review`)
      .set(AUTH)
      .send({ rowIds: [FAKE_ROW_ID] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

// ─── Recompute ────────────────────────────────────────────────────────────────
describe("POST /collections/:id/recompute", () => {
  it("returns 202 with Job shape", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] }) // owns check
    mockEnqueueJob();

    const res = await request(app)
      .post(`${BASE}/collections/${FAKE_COL_ID}/recompute`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });

  it("returns 404 when collection does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // owns check fails

    const res = await request(app)
      .post(`${BASE}/collections/${FAKE_COL_ID}/recompute`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});
