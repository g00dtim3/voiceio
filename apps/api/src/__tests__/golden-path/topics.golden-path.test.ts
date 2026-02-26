/**
 * Golden-path integration test — Topics domain
 *
 * Simulates the complete user journey for the Topics domain using
 * the same in-process mocking strategy as the contract tests (no real DB).
 *
 * Flow under test:
 *   Step 1 — Start analysis    POST /collections
 *                               → 202 { collection, job: queued }
 *
 *   Step 2 — Poll (running)    GET  /collections/:id
 *                               → generationJob.status = "running"
 *
 *   Step 3 — Poll (succeeded)  GET  /collections/:id
 *                               → generationJob.status = "succeeded"
 *
 *   Step 4 — View taxonomy     GET  /collections/:id/categories
 *                               → categories + topics + AI assignment counts
 *
 *   Step 5 — Human correction  POST /assignments  (op: "assign")
 *                               → { affected: 1 }
 *
 *   Step 6 — Review            POST /review       (reviewed: true)
 *                               → { affected: 1 }
 *
 *   Step 7 — Sentiment blocked PATCH /collections/:id { sentimentEnabled: true }
 *                               → 409 CONFLICT  (GWT S2 guard fires)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_COL_ID,
  FAKE_CAT_ID,
  FAKE_TOPIC_ID,
  FAKE_JOB_ID,
  FAKE_ROW_ID,
  dbCollection,
  dbCategory,
  dbTopic,
  NOW,
  expectJobShape,
  expectErrorEnvelope,
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

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const AUTH = { Authorization: `Bearer ${makeToken()}` };
const BASE = `/api/projects/${FAKE_PROJECT_ID}/topics`;

const dbJobQueued = {
  id: FAKE_JOB_ID,
  type: "topic_generation",
  status: "queued",
  progress: 0,
  payload: { collectionId: FAKE_COL_ID, startMode: "scratch", prompt: null },
  result_ref: null,
  error: null,
  created_at: NOW,
  updated_at: NOW,
};

const dbJobRunning    = { ...dbJobQueued, status: "running",   progress: 42  };
const dbJobSucceeded  = { ...dbJobQueued, status: "succeeded", progress: 100 };

// ─── State shared across golden-path steps ───────────────────────────────────
// Each `it` is an independent HTTP call but flows logically from the last.
// collectionId / jobId are captured from step 1 and reused in later assertions.
let capturedCollectionId: string;
let capturedJobId: string;

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("Topics golden path: project → analysis → review", () => {

  // ─── Step 1: Start analysis ────────────────────────────────────────────────
  it("Step 1 — POST /collections: starts analysis and returns queued job", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })               // no existing collection
      .mockResolvedValueOnce({ rows: [dbCollection] })   // upsert RETURNING
      .mockResolvedValueOnce({ rows: [] })               // enqueueJob: no existing job by dedupeKey
      .mockResolvedValueOnce({ rows: [dbJobQueued] });   // enqueueJob: INSERT job

    const res = await request(app)
      .post(`${BASE}/collections`)
      .set(AUTH)
      .send({ textColumnId: "col_feedback", startMode: "scratch", enableSentiment: false });

    expect(res.status).toBe(202);

    // collection shape
    expect(res.body.collection).toMatchObject({
      id: FAKE_COL_ID,
      projectId: FAKE_PROJECT_ID,
      textColumnId: "col_feedback",
      sentimentEnabled: false,
      createdAt: expect.any(String),
    });

    // job shape
    expectJobShape(res.body.job);
    expect(res.body.job.type).toBe("topic_generation");
    expect(res.body.job.status).toBe("queued");
    expect(res.body.job.progress).toBe(0);

    // capture IDs for subsequent assertions
    capturedCollectionId = res.body.collection.id;
    capturedJobId        = res.body.job.id;
    expect(capturedCollectionId).toBe(FAKE_COL_ID);
    expect(capturedJobId).toBe(FAKE_JOB_ID);
  });

  // ─── Step 2: Poll — job is running ────────────────────────────────────────
  it("Step 2 — GET /collections/:id: job transitions to running (progress visible)", async () => {
    // Promise.all fires both queries; mock returns them in order
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [dbJobRunning] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(FAKE_COL_ID);
    expect(res.body.generationJob).toMatchObject({
      id: FAKE_JOB_ID,
      status: "running",
      progress: 42,
      error: null,
    });
  });

  // ─── Step 3: Poll — job succeeded ─────────────────────────────────────────
  it("Step 3 — GET /collections/:id: job transitions to succeeded (100%)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [dbJobSucceeded] });

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.generationJob).toMatchObject({
      status: "succeeded",
      progress: 100,
    });
  });

  // ─── Step 4: View taxonomy generated by the worker ────────────────────────
  it("Step 4 — GET /categories: taxonomy tree available after job succeeded", async () => {
    const dbTopicWithCount = { ...dbTopic, assignment_count: 5 };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] }) // owns check
      .mockResolvedValueOnce({ rows: [dbCategory] })           // categories
      .mockResolvedValueOnce({ rows: [dbTopicWithCount] });    // topics + counts

    const res = await request(app)
      .get(`${BASE}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    const category = res.body.items[0];
    expect(category).toMatchObject({
      id: FAKE_CAT_ID,
      collectionId: FAKE_COL_ID,
      name: "Generated",
    });

    // topics nested inside categories with AI-assigned counts
    expect(category.topics).toHaveLength(1);
    expect(category.topics[0]).toMatchObject({
      id: FAKE_TOPIC_ID,
      label: "Product Quality",
      sentimentEnabled: false,
      assignmentCount: 5,
    });
  });

  // ─── Step 5: Human correction — assign a topic to a row ──────────────────
  it("Step 5 — POST /assignments: human assigns a topic (op: assign)", async () => {
    // Transaction: BEGIN → INSERT (1 row) → COMMIT
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })  // INSERT ON CONFLICT DO NOTHING
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`${BASE}/assignments`)
      .set(AUTH)
      .send({
        op:       "assign",
        rowIds:   [FAKE_ROW_ID],
        topicIds: [FAKE_TOPIC_ID],
        source:   "human",
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: 1 });
  });

  // ─── Step 6: Review — mark the row as reviewed ────────────────────────────
  it("Step 6 — POST /review: marks rows as reviewed (reviewed: true)", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE topic_assignments

    const res = await request(app)
      .post(`${BASE}/review`)
      .set(AUTH)
      .send({ rowIds: [FAKE_ROW_ID], reviewed: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: 1 });
  });

  // ─── Step 7: GWT S2 guard fires — sentiment blocked by existing reviews ───
  it("Step 7 — PATCH /collections/:id: enabling sentiment blocked (409 CONFLICT) because reviews now exist", async () => {
    mockQuery
      // fetch collection: sentiment_enabled is still false
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] })
      // hasReviewedAssignments → the review from step 6 is now in the DB
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

    const res = await request(app)
      .patch(`${BASE}/collections/${FAKE_COL_ID}`)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
    expect(res.body.error.message).toMatch(/sentiment/i);
  });
});
