/**
 * Unit tests — lib/sentiment.ts
 *
 * computeOverallSentiment(values) → OverallSentiment
 *
 * Contracts:
 *   1. Empty / all-null input → zero totals, score 0, dominant null.
 *   2. Counts accumulate correctly; null values are ignored.
 *   3. Rates = count / total (each in [0, 1], sum to 1).
 *   4. Score = (positive − negative) / total ∈ [−1, 1].
 *   5. Dominant = polarity with strict plurality; null on tie or total = 0.
 */
import { describe, it, expect } from "vitest";
import { computeOverallSentiment } from "../../lib/sentiment";

// ─── Empty / all-null input ───────────────────────────────────────────────────
describe("computeOverallSentiment — empty / null input", () => {
  it("returns zero totals and null dominant for an empty array", () => {
    const result = computeOverallSentiment([]);
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
    expect(result.dominant).toBeNull();
    expect(result.positiveRate).toBe(0);
    expect(result.neutralRate).toBe(0);
    expect(result.negativeRate).toBe(0);
  });

  it("returns zero totals and null dominant when all values are null", () => {
    const result = computeOverallSentiment([null, null, null]);
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
    expect(result.dominant).toBeNull();
  });

  it("counts object has all zeros for empty input", () => {
    const { counts } = computeOverallSentiment([]);
    expect(counts.positive).toBe(0);
    expect(counts.neutral).toBe(0);
    expect(counts.negative).toBe(0);
  });
});

// ─── Count accumulation & null ignoring ──────────────────────────────────────
describe("computeOverallSentiment — count accumulation", () => {
  it("counts only non-null sentiment values", () => {
    const result = computeOverallSentiment(["positive", null, "negative", null, "positive"]);
    expect(result.counts.positive).toBe(2);
    expect(result.counts.negative).toBe(1);
    expect(result.counts.neutral).toBe(0);
    expect(result.total).toBe(3);
  });

  it("counts all-positive array correctly", () => {
    const result = computeOverallSentiment(["positive", "positive", "positive"]);
    expect(result.counts.positive).toBe(3);
    expect(result.total).toBe(3);
  });

  it("counts all-negative array correctly", () => {
    const result = computeOverallSentiment(["negative", "negative"]);
    expect(result.counts.negative).toBe(2);
    expect(result.total).toBe(2);
  });

  it("counts all-neutral array correctly", () => {
    const result = computeOverallSentiment(["neutral", "neutral", "neutral", "neutral"]);
    expect(result.counts.neutral).toBe(4);
    expect(result.total).toBe(4);
  });

  it("counts a mixed array with all three polarities", () => {
    const result = computeOverallSentiment(["positive", "neutral", "negative", "positive", "neutral"]);
    expect(result.counts.positive).toBe(2);
    expect(result.counts.neutral).toBe(2);
    expect(result.counts.negative).toBe(1);
    expect(result.total).toBe(5);
  });
});

// ─── Rate calculations ────────────────────────────────────────────────────────
describe("computeOverallSentiment — rate calculations", () => {
  it("rates sum to 1 for a mixed input", () => {
    const result = computeOverallSentiment(["positive", "neutral", "negative"]);
    const sum = result.positiveRate + result.neutralRate + result.negativeRate;
    expect(sum).toBeCloseTo(1, 10);
  });

  it("positiveRate = 1 when all values are positive", () => {
    const result = computeOverallSentiment(["positive", "positive"]);
    expect(result.positiveRate).toBe(1);
    expect(result.neutralRate).toBe(0);
    expect(result.negativeRate).toBe(0);
  });

  it("negativeRate = 1 when all values are negative", () => {
    const result = computeOverallSentiment(["negative", "negative"]);
    expect(result.negativeRate).toBe(1);
    expect(result.positiveRate).toBe(0);
    expect(result.neutralRate).toBe(0);
  });

  it("rates are correct for 2 positive + 2 neutral + 1 negative (total 5)", () => {
    const result = computeOverallSentiment(["positive", "positive", "neutral", "neutral", "negative"]);
    expect(result.positiveRate).toBeCloseTo(2 / 5);
    expect(result.neutralRate).toBeCloseTo(2 / 5);
    expect(result.negativeRate).toBeCloseTo(1 / 5);
  });
});

// ─── Score formula ────────────────────────────────────────────────────────────
describe("computeOverallSentiment — score formula", () => {
  it("score = 1 when all positive", () => {
    expect(computeOverallSentiment(["positive", "positive"]).score).toBe(1);
  });

  it("score = -1 when all negative", () => {
    expect(computeOverallSentiment(["negative", "negative"]).score).toBe(-1);
  });

  it("score = 0 when all neutral", () => {
    expect(computeOverallSentiment(["neutral", "neutral"]).score).toBe(0);
  });

  it("score = 0 when positive count equals negative count", () => {
    const result = computeOverallSentiment(["positive", "negative", "neutral"]);
    // (1 - 1) / 3 = 0
    expect(result.score).toBe(0);
  });

  it("score = (positive - negative) / total for a mixed set", () => {
    // 3 positive, 1 negative, 1 neutral → total 5 → score = (3-1)/5 = 0.4
    const result = computeOverallSentiment(["positive", "positive", "positive", "negative", "neutral"]);
    expect(result.score).toBeCloseTo((3 - 1) / 5);
  });

  it("score = 0 when total is 0 (no divide-by-zero)", () => {
    expect(computeOverallSentiment([]).score).toBe(0);
    expect(computeOverallSentiment([null, null]).score).toBe(0);
  });
});

// ─── Dominant polarity ────────────────────────────────────────────────────────
describe("computeOverallSentiment — dominant polarity", () => {
  it("dominant = 'positive' when positive has strict plurality", () => {
    // 3 positive, 1 neutral, 1 negative
    const result = computeOverallSentiment(["positive", "positive", "positive", "neutral", "negative"]);
    expect(result.dominant).toBe("positive");
  });

  it("dominant = 'negative' when negative has strict plurality", () => {
    const result = computeOverallSentiment(["negative", "negative", "negative", "positive"]);
    expect(result.dominant).toBe("negative");
  });

  it("dominant = 'neutral' when neutral has strict plurality", () => {
    const result = computeOverallSentiment(["neutral", "neutral", "neutral", "positive", "negative"]);
    expect(result.dominant).toBe("neutral");
  });

  it("dominant = null when top two polarities are tied", () => {
    // 2 positive, 2 negative, 1 neutral — positive and negative tie at 2
    const result = computeOverallSentiment(["positive", "positive", "negative", "negative", "neutral"]);
    expect(result.dominant).toBeNull();
  });

  it("dominant = null when all three polarities are equal", () => {
    const result = computeOverallSentiment(["positive", "neutral", "negative"]);
    expect(result.dominant).toBeNull();
  });

  it("dominant = null when total = 0", () => {
    expect(computeOverallSentiment([]).dominant).toBeNull();
    expect(computeOverallSentiment([null]).dominant).toBeNull();
  });

  it("dominant = 'positive' for a single positive entry", () => {
    expect(computeOverallSentiment(["positive"]).dominant).toBe("positive");
  });
});
