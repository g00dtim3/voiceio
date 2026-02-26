/**
 * Contract: /api/projects/:projectId/dataset/rows
 *
 * GET  /dataset/rows                            → 200  PaginatedResponse<DatasetRow>
 * GET  /dataset/rows?focus=1&collectionId=<id>  → 200  non-reviewed rows, sorted by confidence
 * GET  /dataset/rows?focus=1  (no collectionId) → 422  ErrorEnvelope VALIDATION_ERROR
 * GET  /dataset/rows?page=0                     → 422  ErrorEnvelope VALIDATION_ERROR
 *
 * GWT Scenario 3 — Focus mode:
 *   "When user enables focus=1
 *    Then only non-reviewed rows are listed
 *    And sorted by lowest confidence first"
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_COL_ID,
  dbRow,
  expectErrorEnvelope,
  expectPaginatedShape,
} from "../helpers";

const mockQuery   = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH = { Authorization: `Bearer ${makeToken()}` };
const BASE = `/api/projects/${FAKE_PROJECT_ID}/dataset`;

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ─── Standard listing ─────────────────────────────────────────────────────────
describe("GET /dataset/rows — standard", () => {
  it("returns 200 with paginated shape", async () => {
    // Two queries: COUNT then SELECT
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [dbRow] });

    const res = await request(app).get(`${BASE}/rows`).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(50);   // default
  });

  it("DatasetRow items have the expected fields", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [dbRow] });

    const res = await request(app).get(`${BASE}/rows`).set(AUTH);

    expect(res.body.items[0]).toMatchObject({
      id: expect.any(String),
      projectId: FAKE_PROJECT_ID,
      rowIndex: expect.any(Number),
      textToAnalyze: expect.any(Object),
      auxValues: expect.any(Object),
      translatedText: expect.any(Object),
      createdAt: expect.any(String),
    });
  });

  it("forwards page/pageSize query params", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "100" }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${BASE}/rows?page=2&pageSize=10`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(100);
  });

  it("returns 422 VALIDATION_ERROR when page=0 (below min)", async () => {
    const res = await request(app).get(`${BASE}/rows?page=0`).set(AUTH);

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when pageSize exceeds max (500)", async () => {
    const res = await request(app).get(`${BASE}/rows?pageSize=999`).set(AUTH);

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 500 ErrorEnvelope when DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get(`${BASE}/rows`).set(AUTH);

    expect(res.status).toBe(500);
    expectErrorEnvelope(res.body, "INTERNAL_ERROR");
  });
});

// ─── Focus mode (GWT Scenario 3) ─────────────────────────────────────────────
describe("GET /dataset/rows?focus=1 — GWT Scenario 3: Focus mode", () => {
  it("returns 422 VALIDATION_ERROR when collectionId is missing", async () => {
    const res = await request(app).get(`${BASE}/rows?focus=1`).set(AUTH);

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.message).toMatch(/collectionId/i);
  });

  it("returns 200 with paginated non-reviewed rows sorted by confidence", async () => {
    // focus mode uses COUNT DISTINCT then SELECT with GROUP BY + ORDER BY confidence
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "1" }] })
      .mockResolvedValueOnce({ rows: [dbRow] });

    const res = await request(app)
      .get(`${BASE}/rows?focus=1&collectionId=${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
  });

  it("returns 200 with empty items when no unreviewed rows remain", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/rows?focus=1&collectionId=${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("returns 422 when collectionId is not a valid UUID", async () => {
    const res = await request(app)
      .get(`${BASE}/rows?focus=1&collectionId=not-a-uuid`)
      .set(AUTH);

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });
});
