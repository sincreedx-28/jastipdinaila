const PROMO_ITEMS = [
  "🔥 HOT ITEM: Glow Serum Vitamin C best seller minggu ini!",
  "PROMO: Gratis ongkir min. belanja Rp150.000",
  "Khimar Bandana Instan restock hari ini",
  "Diskon 10% untuk pembelian 2 produk Skincare",
];

export function PromoBanner() {
  const text = PROMO_ITEMS.join(" • ");
  return (
    <div className="overflow-hidden bg-[var(--brand-ink)] py-2 text-white">
      <div
        className="inline-block whitespace-nowrap text-sm font-bold tracking-wide"
        style={{ animation: "brand-marquee 22s linear infinite" }}
      >
        <span className="pr-8">{text}</span>
        <span className="pr-8">{text}</span>
      </div>
    </div>
  );
}
