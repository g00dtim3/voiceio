/**
 * Unit tests — lib/filters.ts
 *
 * serializeFilters(Filter[]) → string
 * parseFilters(string | undefined) → Filter[]
 *
 * Key contract (from 00_CONTRACTS.md):
 *   Filter = { field: string, op: "eq"|"neq"|"in"|"contains"|"gte"|"lte", value: any }
 *
 * Round-trip invariant:
 *   parseFilters(serializeFilters(filters)) deep-equals filters
 */
import { describe, it, expect } from "vitest";
import { parseFilters, serializeFilters } from "../../lib/filters";
import { Filter } from "../../types";

// ─── Canonical filter fixtures ────────────────────────────────────────────────
const F_EQ:       Filter = { field: "region",  op: "eq",       value: "US" };
const F_NEQ:      Filter = { field: "region",  op: "neq",      value: "FR" };
const F_IN:       Filter = { field: "status",  op: "in",       value: ["active", "paused"] };
const F_CONTAINS: Filter = { field: "label",   op: "contains", value: "acme" };
const F_GTE:      Filter = { field: "score",   op: "gte",      value: 4.5 };
const F_LTE:      Filter = { field: "score",   op: "lte",      value: 10 };
const ALL_OPS = [F_EQ, F_NEQ, F_IN, F_CONTAINS, F_GTE, F_LTE];

// ─── parseFilters ─────────────────────────────────────────────────────────────
describe("parseFilters", () => {
  it("returns [] when input is undefined", () => {
    expect(parseFilters(undefined)).toEqual([]);
  });

  it("returns [] when input is an empty string", () => {
    expect(parseFilters("")).toEqual([]);
  });

  it("returns [] when input is not valid JSON", () => {
    expect(parseFilters("not json")).toEqual([]);
    expect(parseFilters("{broken:}")).toEqual([]);
    expect(parseFilters("<xml/>")).toEqual([]);
  });

  it("returns [] when JSON parses to a non-array (null)", () => {
    expect(parseFilters("null")).toEqual([]);
  });

  it("returns [] when JSON parses to a non-array (object)", () => {
    expect(parseFilters('{"field":"x"}')).toEqual([]);
  });

  it("returns [] when JSON parses to a non-array (string)", () => {
    expect(parseFilters('"hello"')).toEqual([]);
  });

  it("returns [] when JSON parses to a non-array (number)", () => {
    expect(parseFilters("42")).toEqual([]);
  });

  it("returns [] for an empty JSON array", () => {
    expect(parseFilters("[]")).toEqual([]);
  });

  it("parses a single eq filter correctly", () => {
    const raw = JSON.stringify([F_EQ]);
    expect(parseFilters(raw)).toEqual([F_EQ]);
  });

  it("parses all supported op types", () => {
    const raw = JSON.stringify(ALL_OPS);
    const result = parseFilters(raw);
    expect(result).toHaveLength(ALL_OPS.length);
    expect(result).toEqual(ALL_OPS);
  });

  it("preserves array values in 'in' operator", () => {
    const raw = JSON.stringify([F_IN]);
    const result = parseFilters(raw);
    expect(result[0].value).toEqual(["active", "paused"]);
  });

  it("preserves numeric values", () => {
    const raw = JSON.stringify([F_GTE, F_LTE]);
    const result = parseFilters(raw);
    expect(result[0].value).toBe(4.5);
    expect(result[1].value).toBe(10);
  });
});

// ─── serializeFilters ─────────────────────────────────────────────────────────
describe("serializeFilters", () => {
  it("serializes an empty array to '[]'", () => {
    expect(serializeFilters([])).toBe("[]");
  });

  it("produces valid JSON", () => {
    const raw = serializeFilters(ALL_OPS);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("serialized string parses back to the original array", () => {
    const raw = serializeFilters(ALL_OPS);
    expect(JSON.parse(raw)).toEqual(ALL_OPS);
  });
});

// ─── Round-trip invariant ─────────────────────────────────────────────────────
describe("parseFilters ∘ serializeFilters round-trip", () => {
  it("single filter survives a round-trip", () => {
    expect(parseFilters(serializeFilters([F_EQ]))).toEqual([F_EQ]);
  });

  it("all op types survive a round-trip", () => {
    expect(parseFilters(serializeFilters(ALL_OPS))).toEqual(ALL_OPS);
  });

  it("filters with boolean values survive a round-trip", () => {
    const f: Filter = { field: "verified", op: "eq", value: true };
    expect(parseFilters(serializeFilters([f]))).toEqual([f]);
  });

  it("filters with null values survive a round-trip", () => {
    const f: Filter = { field: "deletedAt", op: "eq", value: null };
    expect(parseFilters(serializeFilters([f]))).toEqual([f]);
  });

  it("filters with nested object values survive a round-trip", () => {
    const f: Filter = { field: "meta", op: "eq", value: { key: "v", n: 1 } };
    expect(parseFilters(serializeFilters([f]))).toEqual([f]);
  });
});
