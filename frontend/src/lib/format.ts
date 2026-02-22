export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number")
    return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(v);
}
