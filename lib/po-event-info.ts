import type { PoEventInfo } from "@/lib/po-event-state";
import { ymd } from "@/lib/po-event-state";

type Row = {
  id: string;
  name: string;
  status: "OPEN" | "ARCHIVED";
  place: string | null;
  openDate: Date | null;
  closeDate: Date | null;
  etaDate: Date | null;
  etaNote: string | null;
  note: string | null;
};

/** DB row → plain, client-safe event info. */
export function toEventInfo(e: Row): PoEventInfo {
  return {
    id: e.id,
    name: e.name,
    archived: e.status === "ARCHIVED",
    place: e.place,
    openDate: ymd(e.openDate),
    closeDate: ymd(e.closeDate),
    etaDate: ymd(e.etaDate),
    etaNote: e.etaNote,
    note: e.note,
  };
}
