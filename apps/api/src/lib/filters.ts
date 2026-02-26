import { Filter } from "../types";

/**
 * Serializes a Filter array to a JSON string suitable for use as a URL
 * query parameter (e.g. ?filters=...).
 */
export function serializeFilters(filters: Filter[]): string {
  return JSON.stringify(filters);
}

/**
 * Parses the `filters` query-parameter string into a Filter array.
 *
 * - Returns [] when the input is undefined, empty, or unparseable JSON.
 * - Returns [] when the parsed value is not an array.
 * - Never throws; malformed input silently degrades to an empty filter set.
 */
export function parseFilters(raw: string | undefined): Filter[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Filter[]) : [];
  } catch {
    return [];
  }
}
