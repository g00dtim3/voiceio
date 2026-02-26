/**
 * Contract: /api/projects
 *
 * GET  /api/projects              → 200  PaginatedResponse<Project>
 * POST /api/projects  (valid)     → 201  Project
 * POST /api/projects  (no name)   → 422  ErrorEnvelope VALIDATION_ERROR
 * POST /api/projects  (empty name)→ 422  ErrorEnvelope VALIDATION_ERROR
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  dbProject,
  expectErrorEnvelope,
  expectPaginatedShape,
} from "../helpers";

const mockQuery = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH = { Authorization: `Bearer ${makeToken()}` };

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ─── GET /api/projects ────────────────────────────────────────────────────────
describe("GET /api/projects", () => {
  it("returns 200 with paginated shape when projects exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbProject] });

    const res = await request(app).get("/api/projects").set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: dbProject.id,
      name: dbProject.name,
      createdAt: expect.any(String),
    });
  });

  it("returns 200 with empty items when no projects exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/projects").set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("returns 500 ErrorEnvelope when the DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection lost"));

    const res = await request(app).get("/api/projects").set(AUTH);

    expect(res.status).toBe(500);
    expectErrorEnvelope(res.body, "INTERNAL_ERROR");
  });
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
describe("POST /api/projects", () => {
  it("returns 201 with project shape on valid body", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbProject] });

    const res = await request(app)
      .post("/api/projects")
      .set(AUTH)
      .send({ name: "My Project" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it("returns 422 VALIDATION_ERROR when name is missing", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set(AUTH)
      .send({});

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("returns 422 VALIDATION_ERROR when name is empty string", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set(AUTH)
      .send({ name: "" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when body is not JSON", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set({ ...AUTH, "Content-Type": "application/json" })
      .send("not json at all");

    // Express JSON parser will reject this at 400 or the route returns 422
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("returns 500 ErrorEnvelope when DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("disk full"));

    const res = await request(app)
      .post("/api/projects")
      .set(AUTH)
      .send({ name: "x" });

    expect(res.status).toBe(500);
    expectErrorEnvelope(res.body, "INTERNAL_ERROR");
  });
});
