import { prisma } from "@/lib/prisma";
import { allocate } from "@/lib/rekap";

// Owner profit report. Money in Rupiah; "modal" = purchase cost.
//
// - Pre-Order: per PO Event, from Rekap Order. A finished line (enough
//   bought, or marked sold out) counts what buyers actually got (FIFO);
//   an unfinished one counts what was ordered and the batch is "Sementara".
//   Cost comes from the line's "Modal" in Daftar belanja. Trip costs of the
//   batch are subtracted. A batch belongs to the period of its close date
//   (or its creation date when there is none).
// - Ready Stock: per month, from sales recorded in Rekap (live / WhatsApp)
//   plus paid web orders, using the average cost at the time of sale.
//   Shipping is passed through to the courier, so it isn't revenue.

export type Period = "bulan" | "lalu" | "3bln" | "tahun" | "semua";
export const PERIODS: [Period, string][] = [
  ["bulan", "Bulan ini"],
  ["lalu", "Bulan lalu"],
  ["3bln", "3 bulan"],
  ["tahun", "Tahun ini"],
  ["semua", "Semua"],
];

const JKT = 7 * 3600 * 1000;

/** [from, to) in UTC for a period, counted in Jakarta calendar months. */
export function periodRange(p: Period, now = Date.now()): { from: Date | null; to: Date | null } {
  const j = new Date(now + JKT);
  const y = j.getUTCFullYear();
  const m = j.getUTCMonth();
  const at = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 1) - JKT);
  if (p === "bulan") return { from: at(y, m), to: null };
  if (p === "lalu") return { from: at(y, m - 1), to: at(y, m) };
  if (p === "3bln") return { from: at(y, m - 2), to: null };
  if (p === "tahun") return { from: at(y, 0), to: null };
  return { from: null, to: null };
}

export type TripCost = { label: string; amount: number };

export type Money = { omzet: number; modal: number; untung: number };

export type PoBatchReport = Money & {
  id: string;
  name: string;
  date: string;
  pcs: number;
  tripCost: number;
  tripCosts: TripCost[];
  final: boolean;
  missingCost: number;
  missingPrice: number;
};

export type ReadyMonthReport = Money & {
  month: string;
  pcs: number;
  live: number;
  web: number;
  missingCost: number;
};

export type Report = {
  total: Money & { tripCost: number; margin: number };
  po: PoBatchReport[];
  ready: ReadyMonthReport[];
  top: { name: string; pcs: number; omzet: number }[];
  missingCostOmzet: number;
  missingCostCount: number;
  missingPriceCount: number;
};

const monthKey = (d: Date) => new Date(d.getTime() + JKT).toISOString().slice(0, 7);

export function parseTripCosts(v: unknown): TripCost[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ label: String(x?.label ?? "").slice(0, 60), amount: Math.max(0, Math.round(Number(x?.amount) || 0)) }))
    .filter((x) => x.label || x.amount);
}

export async function buildReport(period: Period): Promise<Report> {
  const { from, to } = periodRange(period);
  const inPeriod = (d: Date) => (!from || d >= from) && (!to || d < to);
  const top = new Map<string, { name: string; pcs: number; omzet: number }>();
  const addTop = (name: string, pcs: number, omzet: number) => {
    const t = top.get(name) ?? { name, pcs: 0, omzet: 0 };
    t.pcs += pcs;
    t.omzet += omzet;
    top.set(name, t);
  };
  let missingCostOmzet = 0;
  let missingCostCount = 0;
  let missingPriceCount = 0;

  // --- Pre-Order batches ---------------------------------------------------
  const events = await prisma.poEvent.findMany({
    where: { orders: { some: {} } },
    select: {
      id: true,
      name: true,
      closeDate: true,
      createdAt: true,
      tripCosts: true,
      items: true,
      orders: { select: { id: true, itemId: true, buyerId: true, qty: true, createdAt: true } },
    },
  });
  const po: PoBatchReport[] = [];
  for (const ev of events) {
    const when = ev.closeDate ?? ev.createdAt;
    if (!inPeriod(when)) continue;
    const { rows, alloc } = allocate(
      ev.items.map((i) => ({ ...i })),
      ev.orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))
    );
    let omzet = 0;
    let modal = 0;
    let pcs = 0;
    let final = true;
    let missingCost = 0;
    let missingPrice = 0;
    for (const r of rows) {
      const done = r.soldOut || r.got >= r.need;
      if (!done) final = false;
      const q = done ? r.orders.reduce((a, o) => a + (alloc.get(o.id) ?? 0), 0) : r.need;
      if (!q) continue;
      const om = q * r.price;
      if (!r.price) missingPrice++;
      omzet += om;
      pcs += q;
      const item = ev.items.find((i) => i.id === r.id)!;
      if (item.cost == null) {
        if (om) {
          missingCost++;
          missingCostOmzet += om;
        }
      } else modal += q * item.cost;
      addTop(r.name + (r.variant ? ` (${r.variant})` : ""), q, om);
    }
    const tripCosts = parseTripCosts(ev.tripCosts);
    const tripCost = tripCosts.reduce((a, t) => a + t.amount, 0);
    missingCostCount += missingCost;
    missingPriceCount += missingPrice;
    po.push({
      id: ev.id,
      name: ev.name,
      date: when.toISOString().slice(0, 10),
      omzet,
      modal,
      untung: omzet - modal - tripCost,
      pcs,
      tripCost,
      tripCosts,
      final,
      missingCost,
      missingPrice,
    });
  }
  po.sort((a, b) => b.date.localeCompare(a.date));

  // --- Ready Stock per month ----------------------------------------------
  const dateFilter = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
  const [sales, webItems] = await Promise.all([
    prisma.readySale.findMany({ where: { createdAt: dateFilter } }),
    prisma.orderItem.findMany({
      where: {
        productTypeSnapshot: "READY",
        order: {
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
          createdAt: dateFilter,
        },
      },
      include: { order: { select: { createdAt: true } } },
    }),
  ]);
  const months = new Map<string, ReadyMonthReport>();
  const month = (k: string) => {
    const m = months.get(k) ?? { month: k, omzet: 0, modal: 0, untung: 0, pcs: 0, live: 0, web: 0, missingCost: 0 };
    months.set(k, m);
    return m;
  };
  const addSale = (when: Date, name: string, qty: number, price: number, cost: number | null, web: boolean) => {
    const m = month(monthKey(when));
    const om = qty * price;
    m.omzet += om;
    m.pcs += qty;
    if (web) m.web += om;
    else m.live += om;
    if (cost == null) {
      if (om) {
        m.missingCost++;
        missingCostCount++;
        missingCostOmzet += om;
      }
    } else m.modal += qty * cost;
    addTop(name, qty, om);
  };
  for (const s of sales)
    addSale(s.createdAt, s.productName + (s.variantName ? ` (${s.variantName})` : ""), s.qty, s.price, s.costSnapshot, false);
  for (const i of webItems)
    addSale(
      i.order.createdAt,
      i.productNameSnapshot + (i.variantSnapshot ? ` (${i.variantSnapshot})` : ""),
      i.qty,
      i.productPriceSnapshot,
      i.costSnapshot,
      true
    );
  const ready = [...months.values()]
    .map((m) => ({ ...m, untung: m.omzet - m.modal }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const omzet = po.reduce((a, x) => a + x.omzet, 0) + ready.reduce((a, x) => a + x.omzet, 0);
  const modal = po.reduce((a, x) => a + x.modal, 0) + ready.reduce((a, x) => a + x.modal, 0);
  const tripCost = po.reduce((a, x) => a + x.tripCost, 0);
  const untung = omzet - modal - tripCost;
  return {
    total: { omzet, modal, tripCost, untung, margin: omzet ? Math.round((untung / omzet) * 100) : 0 },
    po,
    ready,
    top: [...top.values()].sort((a, b) => b.omzet - a.omzet).slice(0, 5),
    missingCostOmzet,
    missingCostCount,
    missingPriceCount,
  };
}
