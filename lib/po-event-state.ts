// Client-safe PO Event helpers. Dates are "YYYY-MM-DD" calendar days in
// Jakarta time (UTC+7): an event closes at the end of its close day there.

export type PoEventState = "open" | "soon" | "closed" | "archived";

export type PoEventInfo = {
  id: string;
  name: string;
  archived: boolean;
  place: string | null;
  openDate: string | null;
  closeDate: string | null;
  etaDate: string | null;
  etaNote: string | null;
  note: string | null;
};

const JKT = 7 * 3600 * 1000;

/** Start of a Jakarta calendar day, as a timestamp. */
function dayStart(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - JKT;
}

/** "YYYY-MM-DD" of today in Jakarta. */
export function todayJakarta(now = Date.now()) {
  return new Date(now + JKT).toISOString().slice(0, 10);
}

export function eventState(
  e: Pick<PoEventInfo, "archived" | "openDate" | "closeDate">,
  now = Date.now()
): PoEventState {
  if (e.archived) return "archived";
  if (e.openDate && dayStart(e.openDate) > now) return "soon";
  if (e.closeDate && dayStart(e.closeDate) + 24 * 3600 * 1000 <= now) return "closed";
  return "open";
}

/** Calendar days until the close day in Jakarta: 0 = closes today. */
export function daysLeft(closeDate: string, now = Date.now()) {
  return Math.round((dayStart(closeDate) - dayStart(todayJakarta(now))) / (24 * 3600 * 1000));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "20 Nov" / "20 Nov 2026" (English for the shop, Indonesian for admin). */
export function fmtDay(ymd: string, opts: { year?: boolean; id?: boolean } = {}) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${(opts.id ? BULAN : MONTHS)[m - 1]}${opts.year ? ` ${y}` : ""}`;
}

/** Date → "YYYY-MM-DD" for a @db.Date column (stored at UTC midnight). */
export const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
