// ── Topic generation ──────────────────────────────────────────────────────────

export const TOPIC_GENERATION_SYSTEM = `You are an expert qualitative analyst.
Analyse the provided customer feedback texts and generate a coherent topic taxonomy.
Respond ONLY with valid JSON matching this shape:
{ "topics": [{ "name": string, "description": string }] }
Generate between 4 and 12 topics. Make them mutually exclusive and collectively exhaustive.`;

export function topicGenerationUser(texts: string[], userHint: string | null): string {
  const lines: string[] = [];
  if (userHint) lines.push(`Instruction: ${userHint}`);
  lines.push(`Texts to analyze (${texts.length}):`);
  lines.push(texts.map((t, i) => `[${i}] ${t.slice(0, 400)}`).join("\n"));
  return lines.join("\n\n");
}

// ── Topic classification ──────────────────────────────────────────────────────

export function topicClassificationSystem(
  topics: Array<{ name: string; description: string }>,
  sentimentEnabled: boolean
): string {
  const topicList = topics
    .map((t, i) => `[${i}] ${t.name}: ${t.description}`)
    .join("\n");

  const sentimentNote = sentimentEnabled
    ? `\nAlso classify the sentiment of each text as "positive", "neutral", or "negative" and include it as "sentiment" in each assignment.`
    : "";

  return `You are classifying customer feedback texts into predefined topics.

Topics available:
${topicList}
${sentimentNote}
Respond ONLY with valid JSON matching this shape:
{ "assignments": [{ "rowIndex": number, "topicIndex": number, "confidence": number${sentimentEnabled ? ', "sentiment": "positive"|"neutral"|"negative"' : ""} }] }

confidence must be a float between 0 and 1.
Every rowIndex in the input must appear exactly once in the output.`;
}

export function topicClassificationUser(texts: string[]): string {
  return `Classify the following ${texts.length} texts:\n\n` +
    texts.map((t, i) => `[${i}] ${t.slice(0, 500)}`).join("\n");
}

// ── Smart column LLM compute ──────────────────────────────────────────────────

export function smartColumnUser(
  rows: Array<{ rowIndex: number; sources: Record<string, string> }>,
  outputType: string
): string {
  const rowLines = rows
    .map((r) => {
      const src = Object.entries(r.sources)
        .map(([col, val]) => `${col}: ${val}`)
        .join(" | ");
      return `[${r.rowIndex}] ${src}`;
    })
    .join("\n");

  return `Process the following ${rows.length} rows and return a value for each.

Expected output type: ${outputType}

Rows:
${rowLines}

Respond ONLY with valid JSON matching this shape:
{ "results": [{ "rowIndex": number, "value": <${outputType}>, "confidence": number }] }
confidence must be a float between 0 and 1.
Every rowIndex in the input must appear exactly once in the output.`;
}

// ── Insight agent ─────────────────────────────────────────────────────────────

export const INSIGHT_AGENT_SYSTEM = `You are a data analyst for a qualitative analytics platform.
You have access to a run_sql tool to execute read-only SQL queries against a PostgreSQL database.
Always call run_sql to retrieve fresh data before drawing conclusions.
Answer concisely, cite key figures, and reference specific topics or segments when relevant.`;
