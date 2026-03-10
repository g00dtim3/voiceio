import { openai } from "./openai";
import { topicClassificationSystem, topicClassificationUser } from "./prompts";

export interface ClassifyTopic {
  name: string;
  description: string;
}

export interface ClassifyAssignment {
  rowIndex: number;
  topicIndex: number;
  confidence: number;
  sentiment?: string;
}

const VALID_SENTIMENTS = new Set(["positive", "neutral", "negative"]);

/**
 * Classifies a batch of texts into the provided topics using gpt-4o-mini.
 *
 * Reconciliation strategy:
 *  1. Call LLM → parse assignments
 *  2. Find rows whose rowIndex is absent from the response
 *  3. Retry once for missing rows with a stricter instruction
 *  4. For any rows still missing → fallback (topic[0], confidence 0.5)
 *  5. Clamp/validate all values before returning
 *
 * Returns exactly one assignment per input row (rows.length === result.length).
 */
export async function classifyRows(
  rows: Array<{ rowIndex: number; text: string }>,
  topics: ClassifyTopic[],
  sentimentEnabled: boolean
): Promise<ClassifyAssignment[]> {
  if (rows.length === 0) return [];

  const systemPrompt = topicClassificationSystem(topics, sentimentEnabled);

  // ── First call ────────────────────────────────────────────────────────────
  const firstRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: topicClassificationUser(rows.map((r) => r.text)) },
    ],
    temperature: 0,
  });

  const assignments = parseAssignments(firstRes.choices[0].message.content ?? "{}");

  // ── Find missing rowIndexes ───────────────────────────────────────────────
  const covered = new Set(assignments.map((a) => a.rowIndex));
  const missing = rows.filter((r) => !covered.has(r.rowIndex));

  if (missing.length > 0) {
    // ── Retry for missing rows ───────────────────────────────────────────────
    const retrySystem =
      systemPrompt +
      "\n\nCRITICAL: You MUST return an assignment for EVERY row provided. Do not skip any row.";

    const retryRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: retrySystem },
        { role: "user", content: topicClassificationUser(missing.map((r) => r.text)) },
      ],
      temperature: 0,
    });

    // Retry returns rowIndexes local to the missing sub-array; remap to original indexes
    const retryRaw = parseAssignments(retryRes.choices[0].message.content ?? "{}");
    for (const a of retryRaw) {
      const originalRow = missing[a.rowIndex];
      if (originalRow && !covered.has(originalRow.rowIndex)) {
        assignments.push({ ...a, rowIndex: originalRow.rowIndex });
        covered.add(originalRow.rowIndex);
      }
    }

    // ── Fallback for still-missing rows ──────────────────────────────────────
    const stillMissing = rows.filter((r) => !covered.has(r.rowIndex));
    if (stillMissing.length > 0) {
      console.warn(
        `[classify] fallback applied for ${stillMissing.length} rows (topic[0], confidence=0.5)`
      );
      for (const r of stillMissing) {
        assignments.push({
          rowIndex: r.rowIndex,
          topicIndex: 0,
          confidence: 0.5,
          sentiment: sentimentEnabled ? "neutral" : undefined,
        });
      }
    }
  }

  // ── Validate and clamp all assignments ────────────────────────────────────
  return assignments.map((a) => ({
    rowIndex: a.rowIndex,
    topicIndex: Math.min(Math.max(0, Math.round(a.topicIndex ?? 0)), topics.length - 1),
    confidence: clamp(Number.isFinite(a.confidence) ? a.confidence : 0.5, 0, 1),
    sentiment: sentimentEnabled
      ? VALID_SENTIMENTS.has(a.sentiment ?? "") ? a.sentiment : "neutral"
      : undefined,
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAssignments(json: string): ClassifyAssignment[] {
  try {
    const parsed = JSON.parse(json) as { assignments?: unknown[] };
    if (!Array.isArray(parsed.assignments)) return [];
    return parsed.assignments.filter(isAssignment);
  } catch {
    return [];
  }
}

function isAssignment(v: unknown): v is ClassifyAssignment {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).rowIndex === "number" &&
    typeof (v as Record<string, unknown>).topicIndex === "number"
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
