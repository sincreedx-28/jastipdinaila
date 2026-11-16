// WhatsApp order message: built by the shop's WA checkout and read back by
// Rekap Order → "Tempel pesanan dari WhatsApp". Keep both sides in sync.

import { normPhone, rp } from "@/lib/rekap";

export type WaLine = {
  name: string;
  variant: string;
  qty: number;
  price: number;
  type: "READY" | "PO";
  /** PO batch name, if the product belongs to one. */
  batch: string | null;
};

export type WaBuyer = { name: string; phone: string; address: string; note: string };

export function buildWaMessage(lines: WaLine[], buyer: WaBuyer) {
  const out: string[] = ["Halo jastipdinaila, saya mau order:"];
  const row = (l: WaLine, i: number) =>
    `${i + 1}. ${l.name}${l.variant ? ` (Varian: ${l.variant})` : ""} x${l.qty} = ${rp(l.price * l.qty)}`;

  const ready = lines.filter((l) => l.type === "READY");
  if (ready.length) out.push("", "*READY STOCK*", ...ready.map(row));

  const byBatch = new Map<string, WaLine[]>();
  for (const l of lines.filter((x) => x.type === "PO")) {
    const k = l.batch ?? "";
    byBatch.set(k, [...(byBatch.get(k) ?? []), l]);
  }
  for (const [batch, list] of byBatch) {
    out.push("", `*PRE-ORDER${batch ? ` · ${batch}` : ""}*`, ...list.map(row));
  }

  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
  out.push(
    "",
    `*Total: ${rp(total)}* (belum termasuk ongkir)`,
    "",
    `Nama: ${buyer.name.trim()}`,
    `No. HP: ${buyer.phone.trim()}`,
    `Alamat: ${buyer.address.trim()}`
  );
  if (buyer.note.trim()) out.push(`Catatan: ${buyer.note.trim()}`);
  return out.join("\n");
}

export type ParsedWaOrder = {
  name: string;
  phone: string;
  /** Pre-Order lines only; Ready Stock is recorded in its own mode. */
  lines: { name: string; variant: string; qty: number; price: number; batch: string | null }[];
  readyCount: number;
};

/** Reads a pasted WA order (the format above, give or take spacing). */
export function parseWaMessage(text: string): ParsedWaOrder {
  let section: "" | "po" | "ready" = "";
  let batch: string | null = null;
  const res: ParsedWaOrder = { name: "", phone: "", lines: [], readyCount: 0 };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\*/g, "").trim();
    if (!line) continue;
    const po = line.match(/^PRE-?ORDER(?:\s*[·-]\s*(.+))?$/i);
    if (po) {
      section = "po";
      batch = po[1]?.trim() || null;
      continue;
    }
    if (/^READY STOCK/i.test(line)) {
      section = "ready";
      continue;
    }
    const nm = line.match(/^Nama:\s*(.+)$/i);
    if (nm) {
      res.name = nm[1].trim();
      continue;
    }
    const ph = line.match(/^No\.?\s*HP:\s*(.+)$/i);
    if (ph) {
      res.phone = normPhone(ph[1]);
      continue;
    }
    const m = line.match(/^\d+\.\s+(.+?)\s+x(\d+)\s*=\s*Rp\s?([\d.,]+)/i);
    if (!m) continue;
    if (section === "ready") {
      res.readyCount++;
      continue;
    }
    if (section !== "po") continue;
    let name = m[1];
    let variant = "";
    const vm = name.match(/^(.*)\s\((?:[^():]+:\s)?([^()]*)\)$/);
    if (vm) {
      name = vm[1];
      variant = vm[2];
    }
    const qty = Number(m[2]);
    const lineTotal = Number(m[3].replace(/[.,]/g, ""));
    res.lines.push({ name: name.trim(), variant: variant.trim(), qty, price: qty ? Math.round(lineTotal / qty) : 0, batch });
  }
  return res;
}
