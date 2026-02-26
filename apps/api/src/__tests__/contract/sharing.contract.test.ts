/**
 * Contract: Sharing domain
 *
 * GWT S1 — Public share link is view-only:
 *   GET /r/:token (no auth)
 *     → 200 with report in preview mode
 *     → 401 { passwordRequired: true } when password enabled and header absent
 *     → 401 UNAUTHORIZED when password enabled and header wrong
 *     → 404 NOT_FOUND when token not found or share disabled
 *
 *   GET  /:reportId/share         → 200 share settings
 *   POST /:reportId/share         → 201 with token (enables sharing)
 *   DELETE /:reportId/share       → 204 (disables sharing)
 *
 * GWT S2 — Internal share respects additive permissions:
 *   PATCH /:reportId/layout (role=admin)               → 200 (no permission check)
 *   PATCH /:reportId/layout (role=editor)              → 200 (no permission check)
 *   PATCH /:reportId/layout (role=viewer, edit grant)  → 200 (explicit grant)
 *   PATCH /:reportId/layout (role=viewer, no grant)    → 403 FORBIDDEN
 *   PATCH /:reportId/layout (role=external_view_only)  → 403 FORBIDDEN
 *
 *   GET  /:reportId/permissions              → 200 { items }
 *   POST /:reportId/permissions              → 201 ReportPermission
 *   DELETE /:reportId/permissions/:userId    → 204
 */
import { createHash } from "crypto";
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app";
import {
  makeToken,
  FAKE_PROJECT_ID,
  FAKE_REPORT_ID,
  FAKE_USER_ID,
  FAKE_TOKEN,
  FAKE_PERM_ID,
  dbReport,
  dbShareReport,
  dbPermission,
  expectErrorEnvelope,
} from "../helpers";

// ─── Pool mock ────────────────────────────────────────────────────────────────
const mockQuery        = vi.hoisted(() => vi.fn());
const mockRelease      = vi.hoisted(() => vi.fn());
const mockClientQuery  = vi.hoisted(() => vi.fn());
const mockConnect      = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ query: mockClientQuery, release: mockRelease })
);

vi.mock("../../db/pool", () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

const AUTH         = { Authorization: `Bearer ${makeToken()}` };         // admin
const AUTH_EDITOR  = { Authorization: `Bearer ${makeToken("editor")}` };
const AUTH_VIEWER  = { Authorization: `Bearer ${makeToken("viewer")}` };
const AUTH_EXT     = { Authorization: `Bearer ${makeToken("external_view_only")}` };
const BASE         = `/api/projects/${FAKE_PROJECT_ID}/reports`;

const TEST_PASSWORD      = "secret";
const TEST_PASSWORD_HASH = createHash("sha256").update(TEST_PASSWORD).digest("hex");

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [] });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S1 — Public share: GET /r/:token
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT S1 — GET /r/:token: public report view", () => {
  it("returns 200 with report in preview mode when no password set", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbShareReport] });

    const res = await request(app).get(`/r/${FAKE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: FAKE_REPORT_ID,
      mode: "preview",
      name: "Q1 Analysis",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("returns 401 { passwordRequired: true } when password is set and header is absent", async () => {
    const passwordProtected = { ...dbShareReport, share_password_hash: TEST_PASSWORD_HASH };
    mockQuery.mockResolvedValueOnce({ rows: [passwordProtected] });

    const res = await request(app).get(`/r/${FAKE_TOKEN}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ passwordRequired: true });
  });

  it("returns 401 UNAUTHORIZED when password is set and header is wrong", async () => {
    const passwordProtected = { ...dbShareReport, share_password_hash: TEST_PASSWORD_HASH };
    mockQuery.mockResolvedValueOnce({ rows: [passwordProtected] });

    const res = await request(app)
      .get(`/r/${FAKE_TOKEN}`)
      .set("x-share-password", "wrongpassword");

    expect(res.status).toBe(401);
    expectErrorEnvelope(res.body, "UNAUTHORIZED");
  });

  it("returns 200 when correct password is supplied", async () => {
    const passwordProtected = { ...dbShareReport, share_password_hash: TEST_PASSWORD_HASH };
    mockQuery.mockResolvedValueOnce({ rows: [passwordProtected] });

    const res = await request(app)
      .get(`/r/${FAKE_TOKEN}`)
      .set("x-share-password", TEST_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("preview");
  });

  it("returns 404 NOT_FOUND when token is not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/r/nonexistent-token");

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });

  it("does not require Authorization header (public route)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbShareReport] });

    const res = await request(app).get(`/r/${FAKE_TOKEN}`);
    // No Authorization header set — should still succeed
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S1 — Share management: GET/POST/DELETE /:reportId/share
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /:reportId/share: get sharing settings", () => {
  it("returns 200 with share settings", async () => {
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

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("POST /:reportId/share: enable sharing", () => {
  it("returns 201 with sharing settings and a token", async () => {
    const updated = { ...dbShareReport };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

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

  it("returns 201 with passwordEnabled=true when password supplied", async () => {
    const updated = { ...dbShareReport, share_password_hash: TEST_PASSWORD_HASH };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH)
      .send({ password: "mysecret" });

    expect(res.status).toBe(201);
    expect(res.body.passwordEnabled).toBe(true);
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

describe("DELETE /:reportId/share: disable sharing", () => {
  it("returns 204 on success", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/share`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GWT S2 — Additive permissions: PATCH /:reportId/layout enforcement
// ═══════════════════════════════════════════════════════════════════════════════

describe("GWT S2 — PATCH /:reportId/layout: permission enforcement", () => {
  const LAYOUT_URL = `${BASE}/${FAKE_REPORT_ID}/layout`;
  const validLayout = { sections: [] };

  // Helper: mock the full transaction for a successful layout patch
  function mockSuccessfulLayoutPatch(): void {
    mockClientQuery
      .mockResolvedValueOnce({})                               // BEGIN
      .mockResolvedValueOnce({ rows: [{ mode: "edit" }] })     // SELECT mode
      .mockResolvedValueOnce({})                               // DELETE sections
      .mockResolvedValueOnce({});                              // COMMIT
    mockQuery.mockResolvedValueOnce({ rows: [] });             // SELECT sections after commit
  }

  it("allows admin to patch layout without checking permissions", async () => {
    mockSuccessfulLayoutPatch();

    const res = await request(app)
      .patch(LAYOUT_URL)
      .set(AUTH) // admin
      .send(validLayout);

    // Permission middleware calls next() immediately for admin — no DB query needed
    expect(res.status).toBe(200);
  });

  it("allows editor to patch layout without checking permissions", async () => {
    mockSuccessfulLayoutPatch();

    const res = await request(app)
      .patch(LAYOUT_URL)
      .set(AUTH_EDITOR)
      .send(validLayout);

    expect(res.status).toBe(200);
  });

  it("GWT S2 — viewer with explicit edit grant can patch layout", async () => {
    // Permission middleware queries report_permissions → finds a grant
    mockQuery.mockResolvedValueOnce({ rows: [{ id: FAKE_PERM_ID }] }); // permission check
    mockSuccessfulLayoutPatch();

    const res = await request(app)
      .patch(LAYOUT_URL)
      .set(AUTH_VIEWER)
      .send(validLayout);

    expect(res.status).toBe(200);
  });

  it("GWT S2 — viewer without edit grant receives 403 FORBIDDEN", async () => {
    // Permission middleware queries report_permissions → no grant found
    mockQuery.mockResolvedValueOnce({ rows: [] }); // permission check returns empty

    const res = await request(app)
      .patch(LAYOUT_URL)
      .set(AUTH_VIEWER)
      .send(validLayout);

    expect(res.status).toBe(403);
    expectErrorEnvelope(res.body, "FORBIDDEN");
  });

  it("external_view_only role always receives 403 FORBIDDEN", async () => {
    // No DB query needed — middleware rejects immediately
    const res = await request(app)
      .patch(LAYOUT_URL)
      .set(AUTH_EXT)
      .send(validLayout);

    expect(res.status).toBe(403);
    expectErrorEnvelope(res.body, "FORBIDDEN");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Permissions CRUD: GET/POST/DELETE /:reportId/permissions
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /:reportId/permissions: list permissions", () => {
  it("returns 200 with list of granted permissions", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] }) // report existence check
      .mockResolvedValueOnce({ rows: [dbPermission] });           // SELECT permissions

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: FAKE_PERM_ID,
      reportId: FAKE_REPORT_ID,
      userId: FAKE_USER_ID,
      permission: "edit",
      grantedBy: "test-user-1",
      createdAt: expect.any(String),
    });
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // report existence check → miss

    const res = await request(app)
      .get(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("POST /:reportId/permissions: grant permission", () => {
  it("GWT S2 — returns 201 with ReportPermission when granting edit", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] }) // report existence check
      .mockResolvedValueOnce({ rows: [dbPermission] });           // INSERT RETURNING

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ userId: FAKE_USER_ID, permission: "edit" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_PERM_ID,
      reportId: FAKE_REPORT_ID,
      userId: FAKE_USER_ID,
      permission: "edit",
    });
  });

  it("returns 201 with view permission", async () => {
    const viewPerm = { ...dbPermission, permission: "view" };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] })
      .mockResolvedValueOnce({ rows: [viewPerm] });

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ userId: FAKE_USER_ID, permission: "view" });

    expect(res.status).toBe(201);
    expect(res.body.permission).toBe("view");
  });

  it("returns 422 VALIDATION_ERROR when userId is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ permission: "edit" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR when permission is invalid", async () => {
    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ userId: FAKE_USER_ID, permission: "admin" });

    expect(res.status).toBe(422);
    expectErrorEnvelope(res.body, "VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // report existence check → miss

    const res = await request(app)
      .post(`${BASE}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ userId: FAKE_USER_ID, permission: "edit" });

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});

describe("DELETE /:reportId/permissions/:userId: revoke permission", () => {
  it("returns 204 on success", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] }) // report existence check
      .mockResolvedValueOnce({ rowCount: 1 });                    // DELETE

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/permissions/${FAKE_USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  it("returns 404 NOT_FOUND when report does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // report existence check → miss

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/permissions/${FAKE_USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });

  it("returns 404 NOT_FOUND when permission does not exist", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] }) // report existence check
      .mockResolvedValueOnce({ rowCount: 0 });                    // DELETE → no rows

    const res = await request(app)
      .delete(`${BASE}/${FAKE_REPORT_ID}/permissions/${FAKE_USER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body, "NOT_FOUND");
  });
});
