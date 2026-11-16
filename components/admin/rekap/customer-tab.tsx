"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteBuyer, importBuyers, updateBuyer } from "@/lib/actions/rekap";
import {
  buyerMatches,
  fmtPhone,
  nameKey,
  normPhone,
  tidy,
  validPhone,
  type RekapOrder,
} from "@/lib/rekap";
import { NewBuyerForm } from "./buyer-picker";
import { Empty, useRekapAction, type Buyer } from "./shared";

type ImportRow = {
  name: string;
  phone: string;
  raw: string;
  st: "new" | "skip" | "err";
  msg: string;
};

/** Reads pasted spreadsheet rows (Name ⇥ Phone, in either order). */
function parseImport(text: string, buyers: Buyer[]): ImportRow[] {
  const out: ImportRow[] = [];
  const seenP = new Set<string>();
  const seenN = new Set<string>();
  const byPhone = new Map(buyers.map((b) => [b.phone, b]));
  const names = new Set(buyers.map((b) => nameKey(b.name)));
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line
      .split(/\t|;|\||,(?=\s*[+\d(])/)
      .map((c) => c.trim())
      .filter(Boolean);
    const pi = cells.findIndex((c) => /^[+\d\s().-]+$/.test(c) && c.replace(/\D/g, "").length >= 9);
    if (pi < 0) {
      out.push({ name: "", phone: "", raw: line.trim(), st: "skip", msg: "tidak ada no. HP, dilewati" });
      continue;
    }
    const phone = normPhone(cells[pi]);
    const name = tidy(cells.filter((_, i) => i !== pi).find((c) => /[A-Za-z]/.test(c)) ?? "");
    let st: ImportRow["st"] = "new";
    let msg = "baru";
    const ex = byPhone.get(phone);
    if (!name) [st, msg] = ["err", "nama kosong"];
    else if (!validPhone(phone)) [st, msg] = ["err", "no. HP tidak valid"];
    else if (ex)
      [st, msg] = ["skip", nameKey(ex.name) === nameKey(name) ? "sudah terdaftar" : `nomor sudah dipakai ${ex.name}`];
    else if (seenP.has(phone)) [st, msg] = ["skip", "nomor dobel di daftar ini"];
    else if (seenN.has(nameKey(name)) || names.has(nameKey(name)))
      [st, msg] = ["err", "nama sudah dipakai, beri pembeda"];
    if (st === "new") {
      seenP.add(phone);
      seenN.add(nameKey(name));
    }
    out.push({ name, phone, raw: line.trim(), st, msg });
  }
  return out;
}

function EditRow({ buyer, onDone }: { buyer: Buyer; onDone: () => void }) {
  const [name, setName] = useState(buyer.name);
  const [phone, setPhone] = useState(fmtPhone(buyer.phone));
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, startTransition] = useTransition();
  const { pending: deleting, run } = useRekapAction();
  const pending = saving || deleting;

  return (
    <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama" />
        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="No HP" />
      </div>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const r = await updateBuyer(buyer.id, name, phone);
              if (r.ok) {
                toast.success("Customer disimpan");
                onDone();
              } else setError(r.error);
            })
          }
        >
          Simpan
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={confirm ? "text-destructive!" : ""}
          onClick={() => {
            if (!confirm) return setConfirm(true);
            run(() => deleteBuyer(buyer.id), { success: "Customer dihapus", onOk: onDone });
          }}
        >
          {confirm ? "Yakin hapus?" : "Hapus customer"}
        </Button>
      </div>
    </div>
  );
}

/** Customer database: search, add, edit, and import from a spreadsheet. */
export function CustomerTab({ buyers, orders }: { buyers: Buyer[]; orders: RekapOrder[] }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const { pending, run } = useRekapAction();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.buyerId, (m.get(o.buyerId) ?? 0) + 1);
    return m;
  }, [orders]);
  const list = buyers.filter((b) => buyerMatches(b, q));
  const newRows = preview?.filter((r) => r.st === "new") ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau no. HP"
          className="min-w-48 flex-1"
        />
        {!adding && (
          <Button type="button" onClick={() => setAdding(true)}>
            + Customer baru
          </Button>
        )}
      </div>

      {adding && (
        <NewBuyerForm
          defaultName={q && !/\d/.test(q) ? q : ""}
          onSaved={(b) => {
            setAdding(false);
            setQ(b.name);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <details className="box px-4 py-3">
        <summary className="cursor-pointer font-semibold">Impor customer dari Excel / Google Sheets</summary>
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Blok kolom Nama dan No. HP di spreadsheet, salin, lalu tempel di sini (satu customer
            per baris). Nomor yang sudah terdaftar otomatis dilewati.
          </p>
          <Textarea
            rows={6}
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setPreview(null);
            }}
            placeholder={"Sinta Rahma\t081234567890"}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => setPreview(parseImport(paste, buyers))}>
            Cek data
          </Button>
          {preview && (
            <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
              <p className="text-sm">
                <b>{newRows.length}</b> baru · {preview.filter((r) => r.st === "skip").length} dilewati ·{" "}
                {preview.filter((r) => r.st === "err").length} perlu diperbaiki
              </p>
              <ul className="max-h-64 divide-y overflow-auto rounded-lg bg-background text-sm">
                {preview.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 px-3 py-1.5">
                    <span className="min-w-0 truncate">
                      {r.name || <i>{r.raw.slice(0, 40)}</i>}{" "}
                      {r.phone && <span className="text-muted-foreground">{fmtPhone(r.phone)}</span>}
                    </span>
                    <span
                      className={`shrink-0 font-semibold ${
                        r.st === "new" ? "text-emerald-700" : r.st === "err" ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {r.msg}
                    </span>
                  </li>
                ))}
              </ul>
              {newRows.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => importBuyers(newRows.map(({ name, phone }) => ({ name, phone }))), {
                      onOk: (r) => {
                        setPaste("");
                        setPreview(null);
                        toast.success(`${r.added} customer diimpor${r.skipped ? `, ${r.skipped} dilewati` : ""}`);
                      },
                    })
                  }
                >
                  Impor {newRows.length} customer baru
                </Button>
              )}
            </div>
          )}
        </div>
      </details>

      <p className="text-sm text-muted-foreground">
        {buyers.length} customer terdaftar{q ? ` · ${list.length} cocok` : ""}
      </p>
      {list.length === 0 ? (
        <Empty>{q ? "Tidak ada customer yang cocok." : "Belum ada customer."}</Empty>
      ) : (
        <ul className="box divide-y">
          {list.slice(0, 300).map((b) => (
            <li key={b.id} className="px-4 py-3">
              {editing === b.id ? (
                <EditRow buyer={b} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <b className="block truncate">{b.name}</b>
                    <span className="text-sm text-muted-foreground">
                      {fmtPhone(b.phone)}
                      {counts.get(b.id) ? ` · ${counts.get(b.id)} order di PO Event ini` : ""}
                    </span>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(b.id)}>
                    Edit
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
