// ─── Error Envelope ──────────────────────────────────────────────────────────
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "JOB_FAILED"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface ErrorEnvelope {
  error: ApiError;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// ─── Filter ───────────────────────────────────────────────────────────────────
export type FilterOp = "eq" | "neq" | "in" | "contains" | "gte" | "lte";

export interface Filter {
  field: string;
  op: FilterOp;
  value: unknown;
}

// ─── Job ──────────────────────────────────────────────────────────────────────
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  payload: Record<string, unknown>;
  resultRef: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Domain models ────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface DatasetRow {
  id: string;
  projectId: string;
  rowIndex: number;
  textToAnalyze: Record<string, string>;
  auxValues: Record<string, unknown>;
  translatedText: Record<string, string>;
  duplicatesGroupKey: string | null;
  createdAt: string;
}

export interface TopicCollection {
  id: string;
  projectId: string;
  textColumnId: string;
  language: string;
  sentimentEnabled: boolean;
  createdAt: string;
}

export interface TopicCategory {
  id: string;
  collectionId: string;
  name: string;
  sortOrder: number;
  topics: Topic[];
}

export type SentimentValue = "positive" | "neutral" | "negative";

export interface Topic {
  id: string;
  categoryId: string;
  label: string;
  description: string | null;
  sentimentEnabled: boolean;
  sentimentLabels: Record<string, string>;
  sortOrder: number;
  assignmentCount?: number;
}

export interface TopicAssignment {
  id: string;
  projectId: string;
  rowId: string;
  topicId: string;
  sentiment: SentimentValue | null;
  source: "ai" | "human";
  reviewed: boolean;
  confidence: number | null;
  createdAt: string;
}

export interface SmartColumn {
  id: string;
  projectId: string;
  name: string;
  outputType: "text" | "number" | "boolean" | "date" | "json";
  computeType: "mapping" | "formula" | "llm";
  sourceColumns: string[];
  config: Record<string, unknown>;
  status: "draft" | "idle" | "running" | "completed" | "failed" | "outdated";
  createdAt: string;
  updatedAt: string;
}

export interface SmartColumnValue {
  rowId: string;
  smartColumnId: string;
  value: unknown;
  confidence: number | null;
  computedAt: string;
}

export type ReportMode = "preview" | "edit";

export interface ReportShareSettings {
  reportId: string;
  shareEnabled: boolean;
  shareToken: string | null;
  passwordEnabled: boolean;
}

export interface ReportPermission {
  id: string;
  reportId: string;
  userId: string;
  permission: "view" | "edit";
  grantedBy: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  name: string;
  mode: ReportMode;
  createdAt: string;
  updatedAt: string;
}

export interface ReportView {
  id: string;
  reportId: string;
  name: string;
  filters: Filter[];
  segments: Filter[];
  dateRange: Record<string, unknown> | null;
  sortOrder: number;
}

export interface InsightElement {
  id: string;
  sectionId: string;
  type: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ReportSection {
  id: string;
  reportId: string;
  title: string;
  sortOrder: number;
  elements: InsightElement[];
}
