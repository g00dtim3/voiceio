/**
 * Full golden path integration test — all domains
 *
 * Simulates the complete user journey from a populated dataset
 * through every domain in dependency order.  All DB calls are
 * intercepted by the same vi.mock pool strategy used in contract tests.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Fixture dataset  (08_TESTING/fixtures/fixture_dataset.csv)              │
 * │  id │ region │ nps │ reason                                             │
 * │   1 │ US     │  10 │ "Great price and friendly staff."                  │
 * │   2 │ US     │   2 │ "Support was slow and billing incorrect."           │
 * │   3 │ DE     │   7 │ "Network ok, app usability could improve."          │
 * │   4 │ FR     │   9 │ "Good coverage, fast response."                    │
 * │   5 │ DE     │   3 │ "Too expensive and confusing plans."                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ── Phase 0 : Dataset ────────────────────────────────────────────────────────
 *   Step  1 — GET  /dataset/rows                 → 5 rows, text column = "reason"
 *
 * ── Phase 1 : Topics ─────────────────────────────────────────────────────────
 *   Step  2 — POST /topics/collections            → 202 job queued
 *   Step  3 — GET  /topics/collections/:id        → job running (42 %)
 *   Step  4 — GET  /topics/collections/:id        → job succeeded (100 %)
 *   Step  5 — GET  /collections/:id/categories    → 2 categories, 4 topics with AI counts
 *   Step  6 — POST /topics/assignments (assign)   → { affected: 1 }
 *   Step  7 — POST /topics/review                 → { affected: 1 }
 *   Step  8 — PATCH /collections/:id              → 409 CONFLICT (GWT S2 sentiment guard)
 *
 * ── Phase 2 : Smart Columns ──────────────────────────────────────────────────
 *   Step  9 — POST /smart-columns                 → 201 "NPS Segment" column
 *   Step 10 — POST /smart-columns/:id/preview     → 202 job queued
 *   Step 11 — GET  /smart-columns/:id/preview     → 200 sample values
 *   Step 12 — POST /smart-columns/:id/fill        → 202, column status = running
 *
 * ── Phase 3 : Reporting ──────────────────────────────────────────────────────
 *   Step 13 — POST /reports                       → 201 "EMEA Q1 Analysis"
 *   Step 14 — POST /reports/:id/views             → 201 "DE Detractors" view (region=DE)
 *   Step 15 — PATCH /reports/:id { mode:preview } → 200 preview mode set
 *   Step 16 — PATCH /reports/:id/layout           → 409 CONFLICT (GWT S2 preview guard)
 *   Step 17 — PATCH /reports/:id { mode:edit }    → 200 back to edit mode
 *   Step 18 — PATCH /reports/:id/layout           → 200 layout saved (1 section)
 *
 * ── Phase 4 : Insight Agent ──────────────────────────────────────────────────
 *   Step 19 — POST /insight-agent/ask             → 202 job (DE filter + nps≤6 segment)
 *   Step 20 — GET  /insight-agent/answers         → aiGenerated=true, sampleSize=2 (DE rows)
 *   Step 21 — GET  /insight-agent/answers/:id     → full labeled answer
 *
 * ── Phase 5 : Sharing ────────────────────────────────────────────────────────
 *   Step 22 — POST /reports/:id/share             → 201 share link generated
 *   Step 23 — GET  /r/:token                      → 200 public view (mode=preview)
 *   Step 24 — POST /reports/:id/permissions       → 201 analyst granted edit
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
  FAKE_REPORT_ID,
  FAKE_VIEW_ID,
  FAKE_SECTION_ID,
  FAKE_SC_ID,
  FAKE_PERM_ID,
  FAKE_ANSWER_ID,
  FAKE_TOKEN,
  FAKE_USER_ID,
  dbCollection,
  NOW,
  expectJobShape,
  expectErrorEnvelope,
  expectPaginatedShape,
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

// ─── Auth + base URLs ────────────────────────────────────────────────────────
const AUTH    = { Authorization: `Bearer ${makeToken()}` }; // admin role
const DATASET = `/api/projects/${FAKE_PROJECT_ID}/dataset`;
const TOPICS  = `/api/projects/${FAKE_PROJECT_ID}/topics`;
const SC      = `/api/projects/${FAKE_PROJECT_ID}/smart-columns`;
const REPORTS = `/api/projects/${FAKE_PROJECT_ID}/reports`;
const AGENT   = `/api/projects/${FAKE_PROJECT_ID}/insight-agent`;

// ─── Extra UUIDs (beyond helpers.ts) ─────────────────────────────────────────
// Dataset rows (fixture CSV rows 2-5)
const ROW_2_ID = "f0000000-f000-4000-b000-000000000002"; // US, nps=2
const ROW_3_ID = "f0000000-f000-4000-b000-000000000003"; // DE, nps=7
const ROW_4_ID = "f0000000-f000-4000-b000-000000000004"; // FR, nps=9
const ROW_5_ID = "f0000000-f000-4000-b000-000000000005"; // DE, nps=3

// Second topic category + extra topics
const CAT_SUPPORT_ID  = "a0000000-a000-4000-b000-000000000001";
const TOPIC_COST_ID   = "b0000000-b000-4000-b000-000000000001";
const TOPIC_SUPPORT_ID = "b0000000-b000-4000-b000-000000000002";
const TOPIC_BILLING_ID = "b0000000-b000-4000-b000-000000000003";

// Insight-agent dedicated job
const IA_JOB_ID = "c0000000-c000-4000-b000-000000000001";

// ─── Fixture dataset rows (mapped from fixture_dataset.csv) ──────────────────
function makeRow(id: string, rowIndex: number, region: string, nps: number, reason: string) {
  return {
    id, project_id: FAKE_PROJECT_ID, row_index: rowIndex,
    text_to_analyze: { reason },
    aux_values: { id: rowIndex, region, nps },
    translated_text: {}, duplicates_group_key: null, created_at: NOW,
  };
}

const csvRow1 = makeRow(FAKE_ROW_ID, 1, "US", 10, "Great price and friendly staff.");
const csvRow2 = makeRow(ROW_2_ID,    2, "US",  2, "Support was slow and billing incorrect.");
const csvRow3 = makeRow(ROW_3_ID,    3, "DE",  7, "Network ok, app usability could improve.");
const csvRow4 = makeRow(ROW_4_ID,    4, "FR",  9, "Good coverage, fast response.");
const csvRow5 = makeRow(ROW_5_ID,    5, "DE",  3, "Too expensive and confusing plans.");

// ─── Topic taxonomy (generated by AI after analysis) ─────────────────────────
const dbCatValue   = { id: FAKE_CAT_ID,     collection_id: FAKE_COL_ID, name: "Value & Pricing",   sort_order: 0 };
const dbCatSupport = { id: CAT_SUPPORT_ID,   collection_id: FAKE_COL_ID, name: "Customer Support",  sort_order: 1 };

const dbTopicPrice   = { id: FAKE_TOPIC_ID,   category_id: FAKE_CAT_ID,    label: "Price Quality",  description: null, sentiment_enabled: false, sentiment_labels: {}, sort_order: 0, assignment_count: 1 };
const dbTopicCost    = { id: TOPIC_COST_ID,    category_id: FAKE_CAT_ID,    label: "Cost Issues",    description: null, sentiment_enabled: false, sentiment_labels: {}, sort_order: 1, assignment_count: 1 };
const dbTopicSupport = { id: TOPIC_SUPPORT_ID, category_id: CAT_SUPPORT_ID, label: "Support Speed",  description: null, sentiment_enabled: false, sentiment_labels: {}, sort_order: 0, assignment_count: 1 };
const dbTopicBilling = { id: TOPIC_BILLING_ID, category_id: CAT_SUPPORT_ID, label: "Billing Issues", description: null, sentiment_enabled: false, sentiment_labels: {}, sort_order: 1, assignment_count: 1 };

// ─── Job templates ────────────────────────────────────────────────────────────
const makeJob = (id: string, type: string, status: string, progress: number, payload: Record<string, unknown> = {}) => ({
  id, type, status, progress, payload, result_ref: null, error: null, created_at: NOW, updated_at: NOW,
});

const dbJobQueued   = makeJob(FAKE_JOB_ID, "topic_generation",     "queued",    0);
const dbJobRunning  = makeJob(FAKE_JOB_ID, "topic_generation",     "running",  42);
const dbJobSucceeded = makeJob(FAKE_JOB_ID, "topic_generation",    "succeeded", 100);
const dbJobScPreview = makeJob(FAKE_JOB_ID, "smart_column_preview", "queued",    0);
const dbJobScFill    = makeJob(FAKE_JOB_ID, "smart_column_fill",    "queued",    0);
const dbJobAsk       = makeJob(IA_JOB_ID,   "insight_agent_ask",    "queued",    0, {
  question: "What do German users complain about?",
  viewId: FAKE_VIEW_ID,
  filters:  [{ field: "region", op: "eq",  value: "DE" }],
  segments: [{ field: "nps",    op: "lte", value: 6    }],
  dateRange: { from: "2026-01-01", to: "2026-03-31" },
});

// ─── Smart column + NPS segment preview value ─────────────────────────────────
const dbNpsColumn = {
  id: FAKE_SC_ID, project_id: FAKE_PROJECT_ID, name: "NPS Segment",
  output_type: "text", compute_type: "llm",
  source_columns: ["nps", "reason"],
  config: { prompt: "Classify as promoter, passive, or detractor." },
  status: "draft", created_at: NOW, updated_at: NOW,
};
const dbNpsValue = {
  smart_column_id: FAKE_SC_ID, row_id: FAKE_ROW_ID,
  value: "promoter", confidence: 0.98, computed_at: NOW,
};

// ─── Report, view, section ────────────────────────────────────────────────────
const dbEmeaReport = {
  id: FAKE_REPORT_ID, project_id: FAKE_PROJECT_ID,
  name: "EMEA Q1 Analysis", mode: "edit", created_at: NOW, updated_at: NOW,
};
const dbDeView = {
  id: FAKE_VIEW_ID, report_id: FAKE_REPORT_ID,
  name: "DE Detractors",
  filters:  [{ field: "region", op: "eq",  value: "DE" }],
  segments: [{ field: "nps",    op: "lte", value: 6    }],
  date_range: { from: "2026-01-01", to: "2026-03-31" },
  sort_order: 0,
};
const dbSection = {
  id: FAKE_SECTION_ID, report_id: FAKE_REPORT_ID,
  title: "Key Findings", sort_order: 0,
};

// ─── Insight answer (German users, n=2 — rows 3 & 5) ─────────────────────────
const dbAnswerDE = {
  id: FAKE_ANSWER_ID, project_id: FAKE_PROJECT_ID, job_id: IA_JOB_ID,
  question: "What do German users complain about?",
  answer: "German users (n=2) primarily report network/app usability issues and high costs.",
  ai_generated: true, sample_size: 2,
  filters:  [{ field: "region", op: "eq",  value: "DE" }],
  segments: [{ field: "nps",    op: "lte", value: 6    }],
  date_range: { from: "2026-01-01", to: "2026-03-31" },
  view_id: FAKE_VIEW_ID,
  created_at: NOW,
};

// ─── Share settings row ───────────────────────────────────────────────────────
const dbSharedReport = {
  ...dbEmeaReport, share_enabled: true,
  share_token: FAKE_TOKEN, share_password_hash: null,
};

// ─── Shared state (captured across steps) ────────────────────────────────────
let capturedCollectionId: string;
let capturedSmartColumnId: string;
let capturedReportId: string;
let capturedViewId: string;
let capturedShareToken: string;
let capturedAnswerId: string;

beforeEach(() => {
  vi.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [] });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("Full golden path: Dataset → Topics → Smart Columns → Reporting → Insight Agent → Sharing", () => {

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 0: Dataset
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 1 — GET /dataset/rows: 5 rows from fixture CSV (text column = reason)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "5" }] })              // COUNT(*)
      .mockResolvedValueOnce({ rows: [csvRow1, csvRow2, csvRow3, csvRow4, csvRow5] }); // SELECT

    const res = await request(app).get(`${DATASET}/rows`).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.total).toBe(5);
    expect(res.body.items).toHaveLength(5);

    // Verify fixture data is correctly mapped from CSV
    const [r1, r2, r3, r4, r5] = res.body.items;
    expect(r1).toMatchObject({ rowIndex: 1, auxValues: { region: "US", nps: 10 }, textToAnalyze: { reason: "Great price and friendly staff." } });
    expect(r2).toMatchObject({ rowIndex: 2, auxValues: { region: "US", nps:  2 }, textToAnalyze: { reason: "Support was slow and billing incorrect." } });
    expect(r3).toMatchObject({ rowIndex: 3, auxValues: { region: "DE", nps:  7 }, textToAnalyze: { reason: "Network ok, app usability could improve." } });
    expect(r4).toMatchObject({ rowIndex: 4, auxValues: { region: "FR", nps:  9 }, textToAnalyze: { reason: "Good coverage, fast response." } });
    expect(r5).toMatchObject({ rowIndex: 5, auxValues: { region: "DE", nps:  3 }, textToAnalyze: { reason: "Too expensive and confusing plans." } });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 1: Topics
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 2 — POST /topics/collections: starts topic generation on 'reason' column", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })               // no existing collection
      .mockResolvedValueOnce({ rows: [dbCollection] })   // upsert → collection created
      .mockResolvedValueOnce({ rows: [] })               // enqueueJob: no dedup match
      .mockResolvedValueOnce({ rows: [dbJobQueued] });   // enqueueJob: INSERT job

    const res = await request(app)
      .post(`${TOPICS}/collections`)
      .set(AUTH)
      .send({ textColumnId: "reason", startMode: "scratch", enableSentiment: false });

    expect(res.status).toBe(202);
    expect(res.body.collection).toMatchObject({
      id: FAKE_COL_ID,
      projectId: FAKE_PROJECT_ID,
      textColumnId: "col_feedback", // from dbCollection fixture
      sentimentEnabled: false,
    });
    expectJobShape(res.body.job);
    expect(res.body.job.type).toBe("topic_generation");
    expect(res.body.job.status).toBe("queued");
    expect(res.body.job.progress).toBe(0);

    capturedCollectionId = res.body.collection.id;
    expect(capturedCollectionId).toBe(FAKE_COL_ID);
  });

  it("Step 3 — GET /topics/collections/:id: job is running (42 %)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [dbJobRunning] });

    const res = await request(app)
      .get(`${TOPICS}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.generationJob).toMatchObject({
      id: FAKE_JOB_ID, status: "running", progress: 42,
    });
  });

  it("Step 4 — GET /topics/collections/:id: job succeeded (100 %)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [dbCollection] })
      .mockResolvedValueOnce({ rows: [dbJobSucceeded] });

    const res = await request(app)
      .get(`${TOPICS}/collections/${FAKE_COL_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.generationJob).toMatchObject({ status: "succeeded", progress: 100 });
  });

  it("Step 5 — GET /categories: 2 categories, 4 topics with AI assignment counts", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID }] })            // owns check
      .mockResolvedValueOnce({ rows: [dbCatValue, dbCatSupport] })        // categories
      .mockResolvedValueOnce({ rows: [dbTopicPrice, dbTopicCost, dbTopicSupport, dbTopicBilling] }); // topics+counts

    const res = await request(app)
      .get(`${TOPICS}/collections/${FAKE_COL_ID}/categories`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);

    const [catValue, catSupport] = res.body.items;
    expect(catValue).toMatchObject({ name: "Value & Pricing", topics: expect.any(Array) });
    expect(catValue.topics).toHaveLength(2);
    expect(catValue.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Price Quality",  assignmentCount: 1 }),
        expect.objectContaining({ label: "Cost Issues",    assignmentCount: 1 }),
      ])
    );

    expect(catSupport).toMatchObject({ name: "Customer Support", topics: expect.any(Array) });
    expect(catSupport.topics).toHaveLength(2);
    expect(catSupport.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Support Speed",  assignmentCount: 1 }),
        expect.objectContaining({ label: "Billing Issues", assignmentCount: 1 }),
      ])
    );
  });

  it("Step 6 — POST /topics/assignments: human assigns row 2 (billing complaint) to Billing Issues topic", async () => {
    // Transactional: BEGIN → INSERT ON CONFLICT → COMMIT
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT assignment
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`${TOPICS}/assignments`)
      .set(AUTH)
      .send({ op: "assign", rowIds: [ROW_2_ID], topicIds: [TOPIC_BILLING_ID], source: "human" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: 1 });
  });

  it("Step 7 — POST /topics/review: marks row 2 as reviewed by a human analyst", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE topic_assignments SET reviewed=true

    const res = await request(app)
      .post(`${TOPICS}/review`)
      .set(AUTH)
      .send({ rowIds: [ROW_2_ID], reviewed: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ affected: 1 });
  });

  it("Step 8 — PATCH /collections/:id: GWT S2 — enabling sentiment blocked (409) because reviewed assignments now exist", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_COL_ID, sentiment_enabled: false }] }) // get collection
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // hasReviewedAssignments → true

    const res = await request(app)
      .patch(`${TOPICS}/collections/${FAKE_COL_ID}`)
      .set(AUTH)
      .send({ sentimentEnabled: true });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
    expect(res.body.error.message).toMatch(/sentiment/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 2: Smart Columns
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 9 — POST /smart-columns: creates 'NPS Segment' LLM column on reason + nps", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbNpsColumn] }); // INSERT RETURNING

    const res = await request(app)
      .post(SC)
      .set(AUTH)
      .send({
        name: "NPS Segment",
        outputType: "text",
        computeType: "llm",
        sourceColumns: ["nps", "reason"],
        config: { prompt: "Classify as promoter, passive, or detractor." },
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_SC_ID,
      name: "NPS Segment",
      computeType: "llm",
      status: "draft",
    });

    capturedSmartColumnId = res.body.id;
  });

  it("Step 10 — POST /smart-columns/:id/preview: enqueues SMART_COLUMN_PREVIEW job (sample 10 rows)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] }) // existence check
      .mockResolvedValueOnce({ rows: [] })                   // enqueueJob: no dedup
      .mockResolvedValueOnce({ rows: [dbJobScPreview] });    // INSERT job

    const res = await request(app)
      .post(`${SC}/${FAKE_SC_ID}/preview`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("smart_column_preview");
    expect(res.body.status).toBe("queued");
  });

  it("Step 11 — GET /smart-columns/:id/preview: sample shows row 1 (US, nps=10) → 'promoter'", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbNpsValue] }); // SELECT computed values

    const res = await request(app)
      .get(`${SC}/${FAKE_SC_ID}/preview`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      smartColumnId: FAKE_SC_ID,
      rowId: FAKE_ROW_ID,
      value: "promoter",
      confidence: 0.98,
      computedAt: expect.any(String),
    });
  });

  it("Step 12 — POST /smart-columns/:id/fill: queues SMART_COLUMN_FILL and sets status to running", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_SC_ID }] }) // existence check
      .mockResolvedValueOnce({ rows: [] })                   // enqueueJob: no dedup
      .mockResolvedValueOnce({ rows: [dbJobScFill] })        // INSERT job
      .mockResolvedValueOnce({ rowCount: 1 });               // UPDATE status=running

    const res = await request(app)
      .post(`${SC}/${FAKE_SC_ID}/fill`)
      .set(AUTH)
      .send({ mode: "all" });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("smart_column_fill");
    expect(res.body.status).toBe("queued");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 3: Reporting
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 13 — POST /reports: creates 'EMEA Q1 Analysis' report", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbEmeaReport] }); // INSERT RETURNING

    const res = await request(app)
      .post(REPORTS)
      .set(AUTH)
      .send({ name: "EMEA Q1 Analysis" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_REPORT_ID,
      name: "EMEA Q1 Analysis",
      mode: "edit",
    });

    capturedReportId = res.body.id;
  });

  it("Step 14 — POST /reports/:id/views: creates 'DE Detractors' view (region=DE + nps≤6)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbDeView] }); // INSERT view RETURNING

    const res = await request(app)
      .post(`${REPORTS}/${FAKE_REPORT_ID}/views`)
      .set(AUTH)
      .send({
        name: "DE Detractors",
        filters:  [{ field: "region", op: "eq",  value: "DE" }],
        segments: [{ field: "nps",    op: "lte", value: 6    }],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
        sortOrder: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_VIEW_ID,
      reportId: FAKE_REPORT_ID,
      name: "DE Detractors",
      filters: [{ field: "region", op: "eq", value: "DE" }],
    });

    capturedViewId = res.body.id;
  });

  it("Step 15 — PATCH /reports/:id { mode:preview }: switches report to preview mode", async () => {
    const inPreview = { ...dbEmeaReport, mode: "preview" };
    mockQuery.mockResolvedValueOnce({ rows: [inPreview] }); // UPDATE RETURNING

    const res = await request(app)
      .patch(`${REPORTS}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "preview" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("preview");
  });

  it("Step 16 — PATCH /reports/:id/layout: GWT S2 — edit blocked (409) while in preview mode", async () => {
    // Permission middleware: admin → next() immediately (no DB)
    // Handler: BEGIN → SELECT mode (preview!) → ROLLBACK → 409
    mockClientQuery
      .mockResolvedValueOnce({})                                         // BEGIN
      .mockResolvedValueOnce({ rows: [{ mode: "preview" }] })            // SELECT mode
      .mockResolvedValueOnce({});                                        // ROLLBACK

    const res = await request(app)
      .patch(`${REPORTS}/${FAKE_REPORT_ID}/layout`)
      .set(AUTH)
      .send({ sections: [{ title: "Key Findings", sortOrder: 0, elements: [] }] });

    expect(res.status).toBe(409);
    expectErrorEnvelope(res.body, "CONFLICT");
    expect(res.body.error.message).toMatch(/preview/i);
  });

  it("Step 17 — PATCH /reports/:id { mode:edit }: returns report to edit mode", async () => {
    const inEdit = { ...dbEmeaReport, mode: "edit" };
    mockQuery.mockResolvedValueOnce({ rows: [inEdit] }); // UPDATE RETURNING

    const res = await request(app)
      .patch(`${REPORTS}/${FAKE_REPORT_ID}`)
      .set(AUTH)
      .send({ mode: "edit" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("edit");
  });

  it("Step 18 — PATCH /reports/:id/layout: saves layout with 'Key Findings' section", async () => {
    // Permission middleware: admin → next() immediately
    // Handler: BEGIN → SELECT mode (edit) → DELETE sections → INSERT section → COMMIT
    mockClientQuery
      .mockResolvedValueOnce({})                                         // BEGIN
      .mockResolvedValueOnce({ rows: [{ mode: "edit" }] })               // SELECT mode
      .mockResolvedValueOnce({})                                         // DELETE sections
      .mockResolvedValueOnce({ rows: [dbSection] })                      // INSERT section
      .mockResolvedValueOnce({});                                        // COMMIT

    const res = await request(app)
      .patch(`${REPORTS}/${FAKE_REPORT_ID}/layout`)
      .set(AUTH)
      .send({ sections: [{ title: "Key Findings", sortOrder: 0, elements: [] }] });

    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0]).toMatchObject({
      id: FAKE_SECTION_ID,
      reportId: FAKE_REPORT_ID,
      title: "Key Findings",
      sortOrder: 0,
      elements: [],
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 4: Insight Agent
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 19 — POST /insight-agent/ask: question scoped to DE rows (filter + segment + dateRange)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })            // enqueueJob: no dedup
      .mockResolvedValueOnce({ rows: [dbJobAsk] });   // INSERT job

    const res = await request(app)
      .post(`${AGENT}/ask`)
      .set(AUTH)
      .send({
        question: "What do German users complain about?",
        viewId: FAKE_VIEW_ID,
        filters:  [{ field: "region", op: "eq",  value: "DE" }],
        segments: [{ field: "nps",    op: "lte", value: 6    }],
        dateRange: { from: "2026-01-01", to: "2026-03-31" },
      });

    expect(res.status).toBe(202);
    expectJobShape(res.body);
    expect(res.body.type).toBe("insight_agent_ask");

    // GWT: "the agent request includes those parameters"
    expect(res.body.payload).toMatchObject({
      question: "What do German users complain about?",
      viewId: FAKE_VIEW_ID,
      filters:  [{ field: "region", op: "eq",  value: "DE" }],
      segments: [{ field: "nps",    op: "lte", value: 6    }],
      dateRange: { from: "2026-01-01", to: "2026-03-31" },
    });
  });

  it("Step 20 — GET /insight-agent/answers: GWT — answer is AI-labeled with sampleSize=2 (DE rows 3 & 5)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswerDE] }); // SELECT answers

    const res = await request(app).get(`${AGENT}/answers`).set(AUTH);

    expect(res.status).toBe(200);
    expectPaginatedShape(res.body);
    expect(res.body.items).toHaveLength(1);

    const answer = res.body.items[0];
    // GWT: "the response is labeled AI-generated"
    expect(answer.aiGenerated).toBe(true);
    // GWT: "includes sample size (n=...)"
    expect(answer.sampleSize).toBe(2); // rows 3 (DE, nps=7) + row 5 (DE, nps=3)

    // Filter context is preserved on the answer
    expect(answer.filters).toEqual([{ field: "region", op: "eq", value: "DE" }]);
    expect(answer.viewId).toBe(FAKE_VIEW_ID);

    capturedAnswerId = answer.id;
  });

  it("Step 21 — GET /insight-agent/answers/:id: full labeled answer with German-market insights", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbAnswerDE] }); // SELECT answer

    const res = await request(app)
      .get(`${AGENT}/answers/${FAKE_ANSWER_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: FAKE_ANSWER_ID,
      projectId: FAKE_PROJECT_ID,
      jobId: IA_JOB_ID,
      question: "What do German users complain about?",
      answer: "German users (n=2) primarily report network/app usability issues and high costs.",
      aiGenerated: true,
      sampleSize: 2,
      dateRange: { from: "2026-01-01", to: "2026-03-31" },
      createdAt: expect.any(String),
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 5: Sharing
  // ───────────────────────────────────────────────────────────────────────────

  it("Step 22 — POST /reports/:id/share: generates a public share link for the EMEA report", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSharedReport] }); // UPDATE reports SET share_enabled RETURNING

    const res = await request(app)
      .post(`${REPORTS}/${FAKE_REPORT_ID}/share`)
      .set(AUTH)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      reportId: FAKE_REPORT_ID,
      shareEnabled: true,
      passwordEnabled: false,
    });
    expect(typeof res.body.shareToken).toBe("string");

    capturedShareToken = res.body.shareToken;
  });

  it("Step 23 — GET /r/:token: public viewer reads report (no auth, mode forced to preview)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbSharedReport] }); // SELECT by token

    // Public route — no Authorization header
    const res = await request(app).get(`/r/${FAKE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: FAKE_REPORT_ID,
      name: "EMEA Q1 Analysis",
      mode: "preview",                 // always read-only for public viewers
      createdAt: expect.any(String),
    });
    // No auth header required for public link
    expect(res.body.projectId).toBe(FAKE_PROJECT_ID);
  });

  it("Step 24 — POST /reports/:id/permissions: grants 'edit' permission to an analyst user", async () => {
    const dbGrantedPerm = {
      id: FAKE_PERM_ID, report_id: FAKE_REPORT_ID,
      user_id: FAKE_USER_ID, permission: "edit",
      granted_by: "test-user-1", created_at: NOW,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: FAKE_REPORT_ID }] }) // report ownership check
      .mockResolvedValueOnce({ rows: [dbGrantedPerm] });         // INSERT permission RETURNING

    const res = await request(app)
      .post(`${REPORTS}/${FAKE_REPORT_ID}/permissions`)
      .set(AUTH)
      .send({ userId: FAKE_USER_ID, permission: "edit" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: FAKE_PERM_ID,
      reportId: FAKE_REPORT_ID,
      userId: FAKE_USER_ID,
      permission: "edit",
      grantedBy: "test-user-1",
      createdAt: expect.any(String),
    });
  });
});
