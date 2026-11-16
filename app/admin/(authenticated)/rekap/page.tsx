import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { RekapApp, type RekapData } from "@/components/admin/rekap/rekap-app";

type Search = { mode?: string; event?: string; bulan?: string };

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  // Months are counted in Jakarta time (UTC+7).
  const start = new Date(Date.UTC(y, m - 1, 1, -7));
  const end = new Date(Date.UTC(y, m, 1, -7));
  return { start, end };
}

function jakartaMonth(d = new Date()) {
  const j = new Date(d.getTime() + 7 * 3600 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function RekapPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [sp, admin] = await Promise.all([searchParams, getCurrentAdmin()]);
  const isOwner = Boolean(admin?.isSuperAdmin);
  const mode = sp.mode === "ready" ? "ready" : "po";

  const [events, buyers] = await Promise.all([
    prisma.poEvent.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.buyer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);

  const data: RekapData = {
    mode,
    isOwner,
    events: events.map((e) => ({ id: e.id, name: e.name, archived: e.status === "ARCHIVED" })),
    eventId: null,
    buyers,
    items: [],
    orders: [],
    catalog: [],
    readyProducts: [],
    sales: [],
    month: jakartaMonth(),
    months: [],
  };

  if (mode === "po") {
    const current = events.find((e) => e.id === sp.event) ?? events.find((e) => e.status === "OPEN") ?? events[0];
    if (current) {
      data.eventId = current.id;
      const [items, orders, products] = await Promise.all([
        prisma.poItem.findMany({ where: { eventId: current.id }, orderBy: { name: "asc" } }),
        prisma.poOrder.findMany({ where: { eventId: current.id }, orderBy: { createdAt: "asc" } }),
        prisma.product.findMany({
          where: { isActive: true },
          select: {
            name: true,
            type: true,
            variants: { select: { name: true, price: true }, orderBy: { sortOrder: "asc" } },
          },
          orderBy: { name: "asc" },
        }),
      ]);
      data.items = items.map((i) => ({
        id: i.id,
        key: i.key,
        name: i.name,
        variant: i.variant,
        price: i.price,
        got: i.got,
        soldOut: i.soldOut,
        // Purchase cost never leaves the server for non-owner admins.
        ...(isOwner ? { cost: i.cost } : {}),
      }));
      data.orders = orders.map((o) => ({
        id: o.id,
        itemId: o.itemId,
        buyerId: o.buyerId,
        qty: o.qty,
        createdAt: o.createdAt.toISOString(),
      }));
      // Pre-Order products first, for the "Barang" suggestions.
      data.catalog = products
        .sort((a, b) => Number(b.type === "PO") - Number(a.type === "PO"))
        .map((p) => ({
          name: p.name,
          variants: p.variants.filter((v) => v.name).map((v) => ({ name: v.name, price: v.price })),
          price: Math.min(...p.variants.map((v) => v.price)),
        }));
    }
  } else {
    const month = /^\d{4}-\d{2}$/.test(sp.bulan ?? "") ? sp.bulan! : jakartaMonth();
    const { start, end } = monthRange(month);
    const [products, sales, oldest] = await Promise.all([
      prisma.product.findMany({
        where: { type: "READY" },
        select: {
          id: true,
          name: true,
          group: true,
          isActive: true,
          variants: {
            select: { id: true, name: true, price: true, stockQty: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [{ group: "asc" }, { name: "asc" }],
      }),
      prisma.readySale.findMany({
        where: { createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.readySale.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    ]);
    data.month = month;
    data.readyProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      group: p.group,
      isActive: p.isActive,
      variants: p.variants.map((v) => ({ ...v, stockQty: v.stockQty ?? 0 })),
    }));
    data.sales = sales.map((s) => ({
      id: s.id,
      buyerId: s.buyerId,
      productName: s.productName,
      variantName: s.variantName,
      qty: s.qty,
      price: s.price,
      createdAt: s.createdAt.toISOString(),
    }));
    // Month picker: from the first recorded sale up to this month.
    const months: string[] = [];
    const first = oldest ? jakartaMonth(oldest.createdAt) : jakartaMonth();
    let cur = jakartaMonth();
    while (cur >= first && months.length < 60) {
      months.push(cur);
      const [y, m] = cur.split("-").map(Number);
      cur = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    }
    if (!months.includes(month)) months.push(month);
    data.months = months;
  }

  return <RekapApp data={data} />;
}
