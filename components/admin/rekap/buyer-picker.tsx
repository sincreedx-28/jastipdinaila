"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBuyer } from "@/lib/actions/rekap";
import { buyerMatches, fmtPhone } from "@/lib/rekap";
import type { Buyer } from "./shared";

/** Inline "Customer baru" form, shared by the picker and the Customer tab. */
export function NewBuyerForm({
  defaultName = "",
  defaultPhone = "",
  onSaved,
  onCancel,
}: {
  defaultName?: string;
  defaultPhone?: string;
  onSaved: (b: Buyer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Errors show under the form (not as a toast) so they're easy to fix.
  const save = () => {
    setError("");
    startTransition(async () => {
      const r = await createBuyer(name, phone);
      if (r.ok) onSaved(r.buyer);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
      <p className="font-bold">Customer baru</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Nama</span>
          <Input
            autoFocus={!defaultName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-label="Nama customer baru"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">No. HP / WhatsApp</span>
          <Input
            autoFocus={Boolean(defaultName)}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            autoComplete="off"
            aria-label="No HP customer baru"
          />
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan customer"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

/**
 * Pick an existing customer by typing part of the name or phone number, or
 * register a new one on the spot. Enter picks the first match.
 */
export function BuyerPicker({
  buyers,
  value,
  onChange,
}: {
  buyers: Buyer[];
  value: Buyer | null;
  onChange: (b: Buyer | null) => void;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return buyers
      .filter((b) => buyerMatches(b, query))
      .sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(query)) -
            Number(a.name.toLowerCase().startsWith(query)) || a.name.localeCompare(b.name)
      )
      .slice(0, 8);
  }, [buyers, q]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-secondary/50 px-3 py-2">
        <div className="min-w-0">
          <b className="block truncate">{value.name}</b>
          <span className="text-sm text-muted-foreground">{fmtPhone(value.phone)}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onChange(null);
            setQ("");
            setTimeout(() => inputRef.current?.focus());
          }}
        >
          Ganti
        </Button>
      </div>
    );
  }

  if (adding) {
    const digits = q.replace(/\D/g, "");
    const looksLikePhone = digits.length >= 6 && digits.length >= q.replace(/[\s-]/g, "").length;
    return (
      <NewBuyerForm
        defaultName={looksLikePhone ? "" : q.trim()}
        defaultPhone={looksLikePhone ? q.trim() : ""}
        onSaved={(b) => {
          setAdding(false);
          setQ("");
          onChange(b);
        }}
        onCancel={() => setAdding(false)}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (matches[0]) {
            onChange(matches[0]);
            setQ("");
          } else if (q.trim()) setAdding(true);
        }}
        placeholder="Cari nama atau no. HP customer"
        autoComplete="off"
        aria-label="Cari customer"
      />
      {!q.trim() ? (
        <p className="px-1 text-sm text-muted-foreground">
          {buyers.length
            ? `Ketik nama atau no. HP (${buyers.length} customer terdaftar)`
            : "Belum ada customer. Ketik nama untuk menambahkan."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {matches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange(b);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-secondary"
            >
              <b className="truncate">{b.name}</b>
              <span className="shrink-0 text-sm text-muted-foreground">{fmtPhone(b.phone)}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full px-3 py-2.5 text-left font-bold text-primary hover:bg-secondary"
          >
            + Daftarkan customer baru{matches.length ? "" : ` “${q.trim()}”`}
          </button>
        </div>
      )}
    </div>
  );
}
