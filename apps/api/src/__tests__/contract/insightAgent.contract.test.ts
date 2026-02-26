/**
 * Contract: /api/projects/:projectId/insight-agent/*
 *
 * GWT — Context uses active filters:
 *   Given user is in a report with filters/segments/dateRange active
 *   When user asks a question
 *   Then the agent request includes those parameters
 *   And the response is labeled AI-generated
 *   And includes sample size (n=...)
 *
 * POST /ask { question, filters, segments, dateRange, viewId? }
 *   → 202 Job(type=insight_agent_ask) with full filter context in payload
 *
 * GET /answers
 *   → 200 { items: InsightAnswer[] }
 *   Each answer: { aiGenerated: true, sampleSize: number, question, answer, ... }
 *
 * GET /answers/:answerId
 *   → 200 InsightAnswer
 *   → 404 NOT_FOUND when answer does not exist
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_JOB_ID,
  FAKE_ANSWER_ID,
  FAKE_VIEW_ID,
  dbJob,
  dbAnswer,
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
const BASE = `/api/projects/${FAKE_PROJECT_ID}/insight-agent`;

const dbJobAsk = { ...dbJob, type: "insight_agent_ask" };

function mockEnqueueJob(jobRow: typeof dbJob): void {
  mockQuery
    .mockResolvedValueOnce({ rows: [] })        // dedupe SELECT → no match
    .mockResolvedValueOnce({ rows: [jobRow] }); // INSERT INTO jobs RETURNING
}

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockResolvedValue({ query: vi.fn(), release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT: POST /ask — full filter context included in agent request
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT — POST /ask: agent request includes active filters/segments/dateRange", () => {
  it("returns 202 with insight_agent_ask job when full context provided", async () => {
    mockEnqueueJob(dbJobAsk);

    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({
        question: "What are the main themes?",
        filters: [{ field: "region", op: "eq", value: "EMEA" }],
        segments: [{ field: "nps", op: "gte", value: 8 }],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
      });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("insight_agent_ask");
    expect(res.body.status).toBe("queued");
  });

  it("job payload forwards filters to the worker", async () => {
    const jobWithPayload = {
      ...dbJobAsk,
      payload: {
        question: "What are the main themes?",
        viewId: null,
        filters: [{ field: "region", op: "eq", value: "EMEA" }],
        segments: [{ field: "nps", op: "gte", value: 8 }],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
      },
    };
    mockEnqueueJob(jobWithPayload);

    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({
        question: "What are the main themes?",
        filters: [{ field: "region", op: "eq", value: "EMEA" }],
        segments: [{ field: "nps", op: "gte", value: 8 }],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
      });

    expect(res.status).toBe(202);
    // Verify the returned job payload includes all filter context
    expect(res.body.payload).toMatchObject({
      question: "What are the main themes?",
      filters: [{ field: "region", op: "eq", value: "EMEA" }],
      segments: [{ field: "nps", op: "gte", value: 8 }],
      dateRange: { from: "2026-01-01", to: "2026-03-31" },
    });
  });

  it("accepts optional viewId to scope the question to a saved view", async () => {
    const jobWithView = {
      ...dbJobAsk,
      payload: { question: "Top complaints?", viewId: FAKE_VIEW_ID, filters: [], segments: [], dateRange: null },
    };
    mockEnqueueJob(jobWithView);

    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ question: "Top complaints?", viewId: FAKE_VIEW_ID });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.payload?.viewId).toBe(FAKE_VIEW_ID);
  });

  it("returns 202 with empty defaults when no filter context is provided", async () => {
    mockEnqueueJob(dbJobAsk);

    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ question: "Any trends?" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
  });

  it("returns deduplicated job when same question+context is already queued", async () => {
    // enqueueJob finds existing job in dedupe SELECT → returns it directly
    mockQuery.mockResolvedValueOnce({ rows: [dbJobAsk] });

    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ question: "What are the main themes?" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("insight_agent_ask");
  });

  it("returns 422 VALIDATION_ERROR when question is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ filters: [] });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("returns 422 VALIDATION_ERROR when question is empty string", async () => {
    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ question: "" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when viewId is not a valid UUID", async () => {
    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({ question: "Any trends?", viewId: "not-a-uuid" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when a filter has an invalid op", async () => {
    const res = await request(app)
      .post(`${BASE}/ask`)
      .set(AUTH)
      .send({
        question: "Any trends?",
        filters: [{ field: "region", op: "INVALID_OP", value: "EMEA" }],
      });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT: GET /answers — labeled AI-generated with sample size
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT — GET /answers: response labeled AI-generated with sample size", () => {
  it("returns 200 with paginated list of InsightAnswer", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswer] });

    const res = await request(app).get(`${BASE}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
  });

  it("GWT: answer is labeled aiGenerated=true", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswer] });

    const res = await request(app).get(`${BASE}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items[0].aiGenerated).toBe(true);
  });

  it("GWT: answer includes sampleSize (n=...)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswer] });

    const res = await request(app).get(`${BASE}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items[0].sampleSize).toBe(120);
    expect(typeof res.body.items[0].sampleSize).toBe("number");
  });

  it("answer includes the filter context that was active when question was asked", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswer] });

    const res = await request(app).get(`${BASE}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      id: FAKE_ANSWER_ID,
      projectId: FAKE_PROJECT_ID,
      jobId: FAKE_JOB_ID,
      question: "What are the main themes?",
      answer: "The main themes are product quality and shipping speed.",
      aiGenerated: true,
      sampleSize: 120,
      filters: [{ field: "region", op: "eq", value: "EMEA" }],
      segments: [],
      dateRange: null,
      viewId: null,
      createdAt: expect.any(String),
    });
  });

  it("returns 200 with empty list when no answers exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /answers/:answerId
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /answers/:answerId: fetch single answer", () => {
  it("returns 200 with InsightAnswer shape", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswer] });

    const res = await request(app)
      .get(`${BASE}/answers/${FAKE_ANSWER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: FAKE_ANSWER_ID,
      aiGenerated: true,
      sampleSize: 120,
      question: "What are the main themes?",
    });
  });

  it("returns 404 NOT_FOUND when answer does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/answers/${FAKE_ANSWER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});
