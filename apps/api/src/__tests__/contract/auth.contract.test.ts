/**
 * Contract: Auth middleware
 *
 * Every route under /api must:
 *   - Return 401 UNAUTHORIZED when the Authorization header is missing
 *   - Return 401 UNAUTHORIZED when the token is invalid/expired
 *   - Use the ErrorEnvelope shape: { error: { code, message } }
 *
 * Tests a representative route from each domain to verify the middleware is
 * applied uniformly (it is mounted at /api in app.ts).
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { expectErrorEnvelope, makeToken, FAKE_PROJECT_ID } from "../helpers";

// ─── Mock pg pool (auth tests must never hit the DB) ─────────────────────────
const mockQuery   = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ─── Shared expectations ──────────────────────────────────────────────────────
function assert401(res: request.Response): void {
  expect(res.status).toBe(401);
  expectErrorEnvelope(res.body, "UNAUTHORIZED");
  // requestId must be present (injected by requestId middleware)
  expect(res.body.error.requestId).toBeTypeOf("string");
}

// ─── Routes under test ────────────────────────────────────────────────────────
const BASE = `/api/projects`;
const PID  = FAKE_PROJECT_ID;

const PROTECTED_ROUTES: Array<{ method: "get" | "post" | "patch" | "delete"; path: string; body?: object }> = [
  // projects
  { method: "get",  path: `${BASE}` },
  { method: "post", path: `${BASE}`,          body: { name: "x" } },
  // dataset
  { method: "get",  path: `${BASE}/${PID}/dataset/rows` },
  // topics
  { method: "post", path: `${BASE}/${PID}/topics/collections`, body: { textColumnId: "c", startMode: "scratch", enableSentiment: false } },
  { method: "get",  path: `${BASE}/${PID}/topics/collections` },
  { method: "post", path: `${BASE}/${PID}/topics/assignments`, body: { op: "assign", rowIds: [PID], topicIds: [PID] } },
  { method: "post", path: `${BASE}/${PID}/topics/review`,      body: { rowIds: [PID], reviewed: true } },
  // smart-columns
  { method: "get",  path: `${BASE}/${PID}/smart-columns` },
  { method: "post", path: `${BASE}/${PID}/smart-columns`,      body: { name: "x", outputType: "text", computeType: "mapping" } },
  // reports
  { method: "get",  path: `${BASE}/${PID}/reports` },
  { method: "post", path: `${BASE}/${PID}/reports`,            body: { name: "x" } },
  // jobs
  { method: "get",  path: `${BASE}/${PID}/jobs/${PID}` },
  // insight agent
  { method: "post", path: `${BASE}/${PID}/insight-agent/ask`,  body: { question: "?" } },
];

describe("Auth contract — missing Authorization header", () => {
  for (const route of PROTECTED_ROUTES) {
    it(`${route.method.toUpperCase()} ${route.path.replace(`/api/projects/${PID}`, "/api/projects/:id")} → 401`, async () => {
      const req = request(app)[route.method](route.path).set("Content-Type", "application/json");
      const res = route.body ? await req.send(route.body) : await req;
      assert401(res);
    });
  }
});

describe("Auth contract — invalid token", () => {
  it("GET /api/projects with malformed bearer token → 401", async () => {
    const res = await request(app).get(`${BASE}`).set("Authorization", "Bearer not-a-valid-jwt");
    assert401(res);
  });

  it("GET /api/projects with expired token → 401", async () => {
    const expiredToken = makeToken("admin").slice(0, -10) + "XXXXXXXXXX"; // corrupt signature
    const res = await request(app).get(`${BASE}`).set("Authorization", `Bearer ${expiredToken}`);
    assert401(res);
  });

  it("GET /api/projects with 'Bearer ' but no token → 401", async () => {
    // edge case: header starts with "Bearer " but the token is empty
    const res = await request(app).get(`${BASE}`).set("Authorization", "Bearer ");
    assert401(res);
  });
});

describe("Auth contract — /health is public", () => {
  it("GET /health → 200 without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});
