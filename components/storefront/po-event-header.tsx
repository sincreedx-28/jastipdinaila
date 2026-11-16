import { daysLeft, eventState, fmtDay, type PoEventInfo } from "@/lib/po-event-state";

export function periodLabel(e: PoEventInfo) {
  if (e.openDate && e.closeDate) return `${fmtDay(e.openDate)} – ${fmtDay(e.closeDate, { year: true })}`;
  if (e.closeDate) return `Until ${fmtDay(e.closeDate, { year: true })}`;
  if (e.openDate) return `From ${fmtDay(e.openDate)}`;
  return "Open now";
}
export const etaLabel = (e: PoEventInfo) =>
  e.etaDate ? fmtDay(e.etaDate, { year: true }) : e.etaNote || "Admin will update";

/** Short status for a batch: "Closes in 3 days", "Orders closed", … */
export function eventBadge(e: PoEventInfo) {
  const st = eventState(e);
  if (st === "soon") return { text: `Opens ${fmtDay(e.openDate!)}`, hot: false };
  if (st === "closed" || st === "archived") return { text: "Orders closed", hot: false };
  if (e.closeDate) {
    const d = daysLeft(e.closeDate);
    return {
      text: d <= 0 ? "Last day to order!" : d === 1 ? "Closes tomorrow" : `Closes in ${d} days`,
      hot: d <= 3,
    };
  }
  return { text: "Open for orders", hot: false };
}

/** Header above a PO batch on the Pre-Order shelf (and on its products). */
export function PoEventHeader({ event, compact }: { event: PoEventInfo; compact?: boolean }) {
  const st = eventState(event);
  const badge = eventBadge(event);
  return (
    <div
      className={`grid gap-2.5 rounded-2xl border bg-secondary px-4 py-3.5 ${st === "closed" ? "saturate-50" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">PO</span>
        <div className="min-w-32 flex-1">
          <h2 className={`font-heading font-bold ${compact ? "text-base" : "text-lg"}`}>{event.name}</h2>
          {event.place && <p className="text-xs text-muted-foreground">{event.place}</p>}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
            badge.hot ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground"
          }`}
        >
          {badge.text}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card px-3 py-2">
          <span className="block text-xs text-muted-foreground">Order period</span>
          <b className="text-sm">{periodLabel(event)}</b>
        </div>
        <div className="rounded-xl bg-card px-3 py-2">
          <span className="block text-xs text-muted-foreground">Estimated ready</span>
          <b className="text-sm">{etaLabel(event)}</b>
          {event.etaDate && event.etaNote && (
            <span className="block text-xs text-muted-foreground">{event.etaNote}</span>
          )}
        </div>
      </div>
      {event.note && <p className="text-sm text-secondary-foreground">{event.note}</p>}
    </div>
  );
}
