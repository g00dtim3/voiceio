import { SentimentValue } from "../types";

export interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
}

export interface OverallSentiment {
  /** Raw counts per polarity (null sentiments excluded). */
  counts: SentimentCounts;
  /** Number of assignments that carry a non-null sentiment value. */
  total: number;
  /** positive / total  (0 when total = 0). */
  positiveRate: number;
  /** neutral  / total  (0 when total = 0). */
  neutralRate: number;
  /** negative / total  (0 when total = 0). */
  negativeRate: number;
  /**
   * Signed score in [-1, 1].
   *   score = (positive - negative) / total
   * 0 when total = 0.
   */
  score: number;
  /**
   * Polarity with the strict plurality.
   * null when total = 0 or when the top two polarities share the same count.
   */
  dominant: SentimentValue | null;
}

/**
 * Computes the overall sentiment distribution from a list of per-assignment
 * sentiment values. Null sentiments are ignored.
 *
 * @param values  Array of sentiment values (may include nulls).
 */
export function computeOverallSentiment(
  values: Array<SentimentValue | null>
): OverallSentiment {
  const counts: SentimentCounts = { positive: 0, neutral: 0, negative: 0 };

  for (const v of values) {
    if (v === "positive" || v === "neutral" || v === "negative") {
      counts[v]++;
    }
  }

  const total = counts.positive + counts.neutral + counts.negative;

  if (total === 0) {
    return {
      counts,
      total: 0,
      positiveRate: 0,
      neutralRate: 0,
      negativeRate: 0,
      score: 0,
      dominant: null,
    };
  }

  const positiveRate = counts.positive / total;
  const neutralRate  = counts.neutral  / total;
  const negativeRate = counts.negative / total;
  const score        = (counts.positive - counts.negative) / total;

  // Determine dominant: strict plurality (highest count wins).
  // If the top two polarities are tied, dominant is null.
  const sorted = (
    [
      ["positive", counts.positive],
      ["neutral",  counts.neutral],
      ["negative", counts.negative],
    ] as [SentimentValue, number][]
  ).sort((a, b) => b[1] - a[1]);

  const dominant: SentimentValue | null =
    sorted[0][1] > sorted[1][1] ? sorted[0][0] : null;

  return { counts, total, positiveRate, neutralRate, negativeRate, score, dominant };
}
