import { createHash } from "node:crypto";

/** Stable across JSON object-key ordering in Cow responses and PostgreSQL jsonb. */
export function assessmentDigest(value: unknown) {
  const canonical = JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item);
  if (typeof canonical !== "string") throw new Error("Assessment JSON is invalid.");
  return createHash("sha256").update(canonical).digest("hex");
}
