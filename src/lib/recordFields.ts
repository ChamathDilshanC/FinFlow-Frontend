export function strField(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function fmtShortDate(iso: unknown): string {
  const s = strField(iso);
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtShortDateTime(iso: unknown): string {
  const s = strField(iso);
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function categoryNameById(rows: Array<Record<string, unknown>>, id: unknown): string | null {
  const sid = strField(id);
  if (!sid) return null;
  const row = rows.find((c) => strField(c.id) === sid);
  const n = row?.name;
  return typeof n === "string" ? n : null;
}
