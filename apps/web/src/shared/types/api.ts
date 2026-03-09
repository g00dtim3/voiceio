// ─── Cross-module API types ──────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface Filter {
  field: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains";
  value: unknown;
}

export interface Segment {
  id: string;
  label: string;
  filter: Filter;
}

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  rowsAffected: number;
  createdAt: string;
  updatedAt: string;
}

export type Sentiment = "positive" | "neutral" | "negative";
export type AssignmentSource = "ai" | "manual";
export type SmartColumnComputationType = "mapping" | "formula" | "llm";
export type SmartColumnStatus = "draft" | "queued" | "running" | "completed" | "failed" | "outdated";
export type ShareRole = "owner" | "editor" | "viewer";

export type InsightElementType =
  | "key_metrics_overview"
  | "nps_score"
  | "nps_over_time"
  | "topic_correlation"
  | "topic_breakdown"
  | "topic_sentiment"
  | "overall_sentiment"
  | "selected_rows"
  | "narrative_ai_block";

// ─── Dataset / Rows ──────────────────────────────────────────────────────────

export interface TopicAssignment {
  topicId: string;
  topicLabel: string;
  categoryId: string;
  categoryLabel: string;
  sentiment: Sentiment;
  source: AssignmentSource;
  confidence: number;
}

export interface DatasetRow {
  id: string;
  text: string;
  reviewed: boolean;
  flagged: boolean;
  favorite: boolean;
  assignments: TopicAssignment[];
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  label: string;
  description: string;
  sentimentEnabled: boolean;
  order: number;
}

export interface Category {
  id: string;
  label: string;
  order: number;
  topics: Topic[];
}

export interface TopicCollection {
  id: string;
  name: string;
  sentimentEnabled: boolean;
  categories: Category[];
}

export interface TopicGenerationResult {
  status: string;
  groups: {
    new: { label: string; description: string }[];
    similar: { label: string; matchesTopicId: string }[];
    discarded: unknown[];
  };
}

export interface QualityScore {
  globalScore: number;
  dimensions: { label: string; score: number }[];
  breakdown: {
    categoryId: string;
    categoryLabel: string;
    topicId: string;
    topicLabel: string;
    score: number;
    count: number;
    influence: number;
  }[];
}

// ─── Smart Columns ───────────────────────────────────────────────────────────

export interface SmartColumnListItem {
  id: string;
  name: string;
  sourceColumns: string[];
  computationType: SmartColumnComputationType;
  status: SmartColumnStatus;
}

export interface SmartColumnOverview {
  health: string;
  stats: {
    ttaSlotsUsed: number;
    ttaSlotsTotal: number;
    nonTtaSlotsUsed: number;
    nonTtaSlotsTotal: number;
    rowsComputed: number;
  };
  items: SmartColumnListItem[];
}

export interface SmartColumnConfig {
  prompt: string;
  inputVariables: { key: string; sourceColumn: string }[];
  fallbackValue?: string;
}

export interface SmartColumnDetail {
  id: string;
  name: string;
  outputType: string;
  computationType: SmartColumnComputationType;
  status: SmartColumnStatus;
  config: SmartColumnConfig;
}

export interface SmartColumnPreviewItem {
  rowId: string;
  inputs: Record<string, string>;
  output: string;
}

// ─── Insight Agent ───────────────────────────────────────────────────────────

export interface InsightResponse {
  id: string;
  status: string;
  title: string;
  narrative: string;
  rowsAnalyzed: number;
  chart: {
    type: string;
    data: { label: string; value: number }[];
  };
  suggestedQuestions: string[];
  aiGenerated: boolean;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportView {
  id: string;
  name: string;
  filters: Filter[];
  segments: Segment[];
}

export interface InsightElement {
  id: string;
  type: InsightElementType;
  order: number;
  config: Record<string, unknown>;
}

export interface ReportSection {
  id: string;
  name: string;
  order: number;
  elements: InsightElement[];
}

export interface Report {
  id: string;
  name: string;
  views: ReportView[];
  sections: ReportSection[];
  updatedAt: string;
}

// ─── Sharing ─────────────────────────────────────────────────────────────────

export interface TeamMember {
  userId: string;
  name: string;
  role: ShareRole;
}

export interface PublicAccess {
  enabled: boolean;
  shareToken: string;
  passwordEnabled: boolean;
  embedEnabled: boolean;
}

export interface ShareSettings {
  teamAccess: TeamMember[];
  publicAccess: PublicAccess;
}
