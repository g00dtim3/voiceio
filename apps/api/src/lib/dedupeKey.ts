import { createHash } from "crypto";

/**
 * Produces a stable, 40-character hex key that identifies a unique piece of
 * work by its (type, payload) pair.
 *
 * Stability guarantees:
 *   - Key-order independence: { a:1, b:2 } and { b:2, a:1 } yield the same key.
 *   - Nested object keys are also sorted recursively through JSON.stringify's
 *     replacer.
 *   - Different types always produce different keys, regardless of payload.
 *   - Different payload values always produce different keys.
 */
export function computeDedupeKey(
  type: string,
  payload: Record<string, unknown>
): string {
  const sortedPayloadKeys = Object.keys(payload).sort();
  const allKeys = ["type", "payload", ...sortedPayloadKeys];
  const normalized = JSON.stringify({ type, payload }, allKeys);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 40);
}
