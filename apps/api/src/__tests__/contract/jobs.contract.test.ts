/**
 * Contract: /api/projects/:projectId/jobs/:jobId
 *
 * GET /jobs/:jobId (found)       → 200  Job shape (id, type, status, progress, createdAt, updatedAt)
 * GET /jobs/:jobId (not found)   → 404  ErrorEnvelope NOT_FOUND
 * GET /jobs/:jobId (DB throws)   → 500  ErrorEnvelope INTERNAL_ERROR
 *
 * Also validates the Job schema against the openapi.yaml definition:
 *   status must be one of: queued | running | succeeded | failed | canceled
 *   progress must be 0–100
 *   createdAt / updatedAt must be ISO-8601 strings
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_JOB_ID,
  dbJob,
  expectErrorEnvelope,
  expectJobShape,
  NOW,
} from "../helpers";

const mockQuery   = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH = { Authorization: `Bearer ${makeToken()}` };
const BASE = `/api/projects/${FAKE_PROJECT_ID}/jobs`;

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("GET /jobs/:jobId", () => {
  it("returns 200 with full Job shape when job exists", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbJob] });

    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);

    expect(res.status).toBe(200);
    expectJobShape(res.body);
  });

  it("Job shape matches openapi.yaml schema exactly", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbJob] });

    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
    const job = res.body;

    // Required fields per openapi.yaml
    expect(job.id).toBeTypeOf("string");
    expect(job.type).toBeTypeOf("string");
    expect(["queued", "running", "succeeded", "failed", "canceled"]).toContain(job.status);
    expect(job.progress).toBeTypeOf("number");
    expect(job.progress).toBeGreaterThanOrEqual(0);
    expect(job.progress).toBeLessThanOrEqual(100);
    expect(job.createdAt).toBeTypeOf("string");
    expect(new Date(job.createdAt).toISOString()).toBe(job.createdAt); // valid ISO-8601
    expect(job.updatedAt).toBeTypeOf("string");
    expect(new Date(job.updatedAt).toISOString()).toBe(job.updatedAt);
  });

  it("resultRef is null when job has no result yet", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...dbJob, result_ref: null }] });
    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
    expect(res.body.resultRef).toBeNull();
  });

  it("resultRef is a string when job has succeeded", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...dbJob, status: "succeeded", result_ref: '{"topicsCreated":5}', progress: 100 }],
    });
    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
    expect(res.body.status).toBe("succeeded");
    expect(res.body.resultRef).toBeTypeOf("string");
    expect(res.body.progress).toBe(100);
  });

  it("error field is populated when job has failed", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...dbJob, status: "failed", error: "Collection not found" }],
    });
    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
    expect(res.body.status).toBe("failed");
    expect(res.body.error).toBe("Collection not found");
  });

  it("returns 404 NOT_FOUND ErrorEnvelope when job does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });

  it("ErrorEnvelope on 404 has requestId", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
    expect(res.body.error.requestId).toBeTypeOf("string");
  });

  it("returns 500 INTERNAL_ERROR ErrorEnvelope when DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);

    expect(res.status).toBe(500);
    expectErrorEnvelope(res.body, "INTERNAL_ERROR");
  });
});

// ─── Job status progression (status contract) ─────────────────────────────────
describe("Job status contract — all valid statuses are returned as-is", () => {
  const statuses = ["queued", "running", "succeeded", "failed", "canceled"] as const;

  for (const status of statuses) {
    it(`returns status="${status}" correctly`, async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...dbJob, status }] });
      const res = await request(app).get(`${BASE}/${FAKE_JOB_ID}`).set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    });
  }
});
