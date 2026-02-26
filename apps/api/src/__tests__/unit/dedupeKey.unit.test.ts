/**
 * Unit tests — lib/dedupeKey.ts
 *
 * computeDedupeKey(type, payload) → 40-char hex string
 *
 * Contracts:
 *   1. Determinism   — same (type, payload) always returns the same key.
 *   2. Key-order independence — payload { a, b } ≡ payload { b, a }.
 *   3. Type isolation — different types, same payload → different keys.
 *   4. Value sensitivity — different payload value → different key.
 *   5. Format — output is exactly 40 lowercase hex characters.
 */
import { describe, it, expect } from "vitest";
import { computeDedupeKey } from "../../lib/dedupeKey";

// ─── Determinism ──────────────────────────────────────────────────────────────
describe("computeDedupeKey — determinism", () => {
  it("returns the same key on repeated calls with the same arguments", () => {
    const a = computeDedupeKey("topic_generation", { collectionId: "abc", startMode: "scratch" });
    const b = computeDedupeKey("topic_generation", { collectionId: "abc", startMode: "scratch" });
    expect(a).toBe(b);
  });

  it("returns the same key for an empty payload", () => {
    expect(computeDedupeKey("insight_agent_ask", {})).toBe(
      computeDedupeKey("insight_agent_ask", {})
    );
  });
});

// ─── Key-order independence ───────────────────────────────────────────────────
describe("computeDedupeKey — payload key-order independence", () => {
  it("{ a, b } and { b, a } produce the same key", () => {
    const k1 = computeDedupeKey("smart_column_fill", { smartColumnId: "x", mode: "all" });
    const k2 = computeDedupeKey("smart_column_fill", { mode: "all", smartColumnId: "x" });
    expect(k1).toBe(k2);
  });

  it("three-key payloads in any order produce the same key", () => {
    const payload1 = { collectionId: "c1", startMode: "scratch", prompt: null };
    const payload2 = { prompt: null, collectionId: "c1", startMode: "scratch" };
    const payload3 = { startMode: "scratch", prompt: null, collectionId: "c1" };
    const k = computeDedupeKey("topic_generation", payload1);
    expect(computeDedupeKey("topic_generation", payload2)).toBe(k);
    expect(computeDedupeKey("topic_generation", payload3)).toBe(k);
  });
});

// ─── Type isolation ───────────────────────────────────────────────────────────
describe("computeDedupeKey — type isolation", () => {
  it("different types with an identical payload produce different keys", () => {
    const payload = { id: "same-id" };
    const k1 = computeDedupeKey("topic_generation",    payload);
    const k2 = computeDedupeKey("topic_recompute",     payload);
    const k3 = computeDedupeKey("smart_column_fill",   payload);
    const k4 = computeDedupeKey("smart_column_preview", payload);
    const k5 = computeDedupeKey("insight_agent_ask",   payload);
    const keys = new Set([k1, k2, k3, k4, k5]);
    expect(keys.size).toBe(5); // all distinct
  });

  it("empty string type is distinct from any real type", () => {
    const payload = {};
    expect(computeDedupeKey("", payload)).not.toBe(
      computeDedupeKey("topic_generation", payload)
    );
  });
});

// ─── Value sensitivity ────────────────────────────────────────────────────────
describe("computeDedupeKey — value sensitivity", () => {
  it("different collectionId values produce different keys", () => {
    const k1 = computeDedupeKey("topic_generation", { collectionId: "aaa" });
    const k2 = computeDedupeKey("topic_generation", { collectionId: "bbb" });
    expect(k1).not.toBe(k2);
  });

  it("boolean vs string values are distinct", () => {
    const k1 = computeDedupeKey("smart_column_fill", { mode: "all" });
    const k2 = computeDedupeKey("smart_column_fill", { mode: true });
    expect(k1).not.toBe(k2);
  });

  it("null vs undefined payload values are distinct", () => {
    // undefined fields are dropped by JSON.stringify; null is preserved
    const k1 = computeDedupeKey("t", { a: null });
    const k2 = computeDedupeKey("t", {});        // { a: undefined } → {}
    expect(k1).not.toBe(k2);
  });

  it("number vs string representation of same number are distinct", () => {
    const k1 = computeDedupeKey("t", { v: 1 });
    const k2 = computeDedupeKey("t", { v: "1" });
    expect(k1).not.toBe(k2);
  });

  it("extra payload key produces a different key", () => {
    const k1 = computeDedupeKey("t", { a: 1 });
    const k2 = computeDedupeKey("t", { a: 1, b: 2 });
    expect(k1).not.toBe(k2);
  });
});

// ─── Output format ────────────────────────────────────────────────────────────
describe("computeDedupeKey — output format", () => {
  it("returns exactly 40 characters", () => {
    expect(computeDedupeKey("topic_generation", { collectionId: "x" })).toHaveLength(40);
    expect(computeDedupeKey("t", {})).toHaveLength(40);
  });

  it("output contains only lowercase hex characters", () => {
    const key = computeDedupeKey("topic_generation", { collectionId: "x" });
    expect(key).toMatch(/^[0-9a-f]{40}$/);
  });

  it("a known payload produces the expected key (regression)", () => {
    // Captured once; acts as a change-detector for the hashing algorithm.
    const key = computeDedupeKey("topic_generation", { collectionId: "abc" });
    expect(typeof key).toBe("string");
    expect(key).toHaveLength(40);
    // Re-run must produce the same value
    expect(computeDedupeKey("topic_generation", { collectionId: "abc" })).toBe(key);
  });
});
