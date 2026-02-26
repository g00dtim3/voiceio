import jwt from "jsonwebtoken";
import { expect } from "vitest";

export const JWT_SECRET = "dev-secret-change-in-production";

// ─── Fake UUIDs ───────────────────────────────────────────────────────────────
export const FAKE_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
export const FAKE_COL_ID     = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
export const FAKE_CAT_ID     = "cccccccc-cccc-4ccc-cccc-cccccccccccc";
export const FAKE_TOPIC_ID   = "dddddddd-dddd-4ddd-dddd-dddddddddddd";
export const FAKE_JOB_ID     = "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee";
export const FAKE_ROW_ID     = "ffffffff-ffff-4fff-ffff-ffffffffffff";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export function makeToken(role: string = "admin"): string {
  return jwt.sign({ sub: "test-user-1", role }, JWT_SECRET, { expiresIn: "1h" });
}

// ─── Canonical DB rows ────────────────────────────────────────────────────────
export const NOW = new Date("2026-01-01T00:00:00.000Z");

export const dbProject = {
  id: FAKE_PROJECT_ID,
  name: "Test Project",
  created_at: NOW,
};

export const dbCollection = {
  id: FAKE_COL_ID,
  project_id: FAKE_PROJECT_ID,
  text_column_id: "col_feedback",
  language: "en",
  sentiment_enabled: false,
  created_at: NOW,
};

export const dbJob = {
  id: FAKE_JOB_ID,
  type: "topic_generation",
  status: "queued",
  progress: 0,
  payload: {},
  result_ref: null,
  error: null,
  created_at: NOW,
  updated_at: NOW,
};

export const dbCategory = {
  id: FAKE_CAT_ID,
  collection_id: FAKE_COL_ID,
  name: "Generated",
  sort_order: 0,
};

export const dbTopic = {
  id: FAKE_TOPIC_ID,
  category_id: FAKE_CAT_ID,
  label: "Product Quality",
  description: null,
  sentiment_enabled: false,
  sentiment_labels: {},
  sort_order: 0,
  assignment_count: 0,
};

export const dbRow = {
  id: FAKE_ROW_ID,
  project_id: FAKE_PROJECT_ID,
  row_index: 1,
  text_to_analyze: { col_feedback: "great product" },
  aux_values: {},
  translated_text: {},
  duplicates_group_key: null,
  created_at: NOW,
};

// ─── Contract assertion helpers ───────────────────────────────────────────────

/** Asserts the response body matches the ErrorEnvelope contract from 00_CONTRACTS.md */
export function expectErrorEnvelope(body: unknown, expectedCode?: string): void {
  expect(body).toMatchObject({
    error: expect.objectContaining({
      code: expect.any(String),
      message: expect.any(String),
    }),
  });
  if (expectedCode) {
    expect((body as { error: { code: string } }).error.code).toBe(expectedCode);
  }
}

/** Asserts the response body matches the Job schema from openapi.yaml */
export function expectJobShape(body: unknown): void {
  expect(body).toMatchObject({
    id: expect.any(String),
    type: expect.any(String),
    status: expect.stringMatching(/^(queued|running|succeeded|failed|canceled)$/),
    progress: expect.any(Number),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
}

/** Asserts the response body matches the Pagination contract from 00_CONTRACTS.md */
export function expectPaginatedShape(body: unknown): void {
  expect(body).toMatchObject({
    items: expect.any(Array),
    page: expect.any(Number),
    pageSize: expect.any(Number),
    total: expect.any(Number),
  });
}
