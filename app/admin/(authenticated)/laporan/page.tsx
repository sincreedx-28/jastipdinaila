import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { buildReport, PERIODS, type Money, type Period } from "@/lib/report";
import { rp } from "@/lib/rekap";
import { TripCostEditor } from "@/components/admin/trip-cost-editor";

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T12:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

function Nums({ m, trip }: { m: Money; trip?: number }) {
  const cells: [string, number, string?][] = [
    ["Omzet", m.omzet],
    ["Modal", m.modal],
    ...(trip !== undefined ? ([["Biaya trip", trip]] as [string, number][]) : []),
    ["Untung", m.untung, m.untung < 0 ? "text-destructive" : "text-emerald-700"],
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {cells.map(([l, v, c]) => (
        <div key={l} className="rounded-xl bg-secondary/60 px-3 py-1.5">
          <span className="block text-xs text-muted-foreground">{l}</span>
          <b className={`tabular-nums ${c ?? ""}`}>{rp(v)}</b>
        </div>
      ))}
    </div>
  );
}

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [{ p }, admin] = await Promise.all([searchParams, getCurrentAdmin()]);
  if (!admin?.isSuperAdmin) redirect("/admin");
  const period = (PERIODS.some(([k]) => k === p) ? p : "bulan") as Period;
  const r = await buildReport(period);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">Laporan</h2>
        <p className="text-sm text-muted-foreground">Omzet, modal, dan keuntungan. Hanya terlihat oleh owner.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {PERIODS.map(([k, l]) => (
          <Link key={k} href={`/admin/laporan?p=${k}`} className="pill" data-active={period === k}>
            {l}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Omzet", r.total.omzet, ""],
          ["Modal barang", r.total.modal, ""],
          ["Biaya trip", r.total.tripCost, ""],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl bg-secondary p-3">
            <span className="block text-sm text-muted-foreground">{l}</span>
            <b className="font-heading text-xl tabular-nums">{rp(v as number)}</b>
          </div>
        ))}
        <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
          <span className="block text-sm opacity-90">Keuntungan</span>
          <b className="font-heading text-xl tabular-nums">{rp(r.total.untung)}</b>
          <span className="block text-xs opacity-90">margin {r.total.margin}%</span>
        </div>
      </div>

      {r.missingPriceCount > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {r.missingPriceCount} barang PO belum ada harga jualnya, jadi belum masuk omzet. Isi di
          Rekap Order → Daftar belanja.
        </p>
      )}
      {r.missingCostCount > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Harga modal belum diisi untuk {r.missingCostCount} barang/penjualan (omzet{" "}
          {rp(r.missingCostOmzet)}), jadi keuntungan di atas masih terlalu tinggi. Isi modal
          barang PO di Rekap Order → Daftar belanja, dan modal Ready Stock lewat “+ Belanja” di
          Edit produk.
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-lg">Pre-Order per batch</h3>
        {r.po.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada order PO di periode ini.</p>
        ) : (
          r.po.map((b) => (
            <div key={b.id} className="box space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <b className="text-base">{b.name}</b>
                  <p className="text-sm text-muted-foreground">
                    {b.pcs} pcs
                    {b.missingCost > 0 && ` · ${b.missingCost} barang belum ada modal`}
                    {b.missingPrice > 0 && ` · ${b.missingPrice} belum ada harga`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    b.final ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {b.final ? "Final" : "Sementara"}
                </span>
              </div>
              <Nums m={b} trip={b.tripCost} />
              <TripCostEditor eventId={b.id} initial={b.tripCosts} />
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-lg">Ready Stock per bulan</h3>
        {r.ready.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada penjualan Ready Stock di periode ini.</p>
        ) : (
          r.ready.map((m) => (
            <div key={m.month} className="box space-y-3 p-4">
              <div>
                <b className="text-base">{monthLabel(m.month)}</b>
                <p className="text-sm text-muted-foreground">
                  {m.pcs} pcs · live/WA {rp(m.live)} · web {rp(m.web)}
                  {m.missingCost > 0 && ` · ${m.missingCost} penjualan tanpa modal`}
                </p>
              </div>
              <Nums m={m} />
            </div>
          ))
        )}
      </section>

      {r.top.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg">Paling laku</h3>
          <ol className="box divide-y">
            {r.top.map((t, i) => (
              <li key={t.name} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  {i + 1}. {t.name} <span className="text-muted-foreground">{t.pcs} pcs</span>
                </span>
                <b className="tabular-nums">{rp(t.omzet)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        PO dihitung dari barang yang didapat kalau belanjanya sudah selesai, atau dari jumlah
        pesanan kalau masih berjalan (ditandai Sementara). PO masuk periode sesuai tanggal close
        batch-nya. Ready Stock dihitung dari penjualan di Rekap (live/WA) dan pesanan web yang
        sudah dibayar, dengan modal rata-rata saat terjual. Ongkir tidak dihitung sebagai omzet.
      </p>
    </div>
  );
}
