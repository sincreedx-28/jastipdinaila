"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { catKey, type CategoryOption } from "@/lib/category";

/**
 * Text field with the names already in use listed under it (tap one to fill
 * it in), so the same category isn't typed twice in different spellings.
 * A new name can still be typed. A name that matches an existing one in a
 * different spelling ("skin care" vs "Skincare") is pointed out; the server
 * saves it in the existing spelling anyway.
 */
export function SuggestInput({
  id,
  name,
  defaultValue,
  placeholder,
  options,
  onValueChange,
  what = "kategori",
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Existing names, best matches for the context first. */
  options: CategoryOption[];
  onValueChange?: (v: string) => void;
  /** "kategori" or "sub-kategori", for the hints. */
  what?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (v: string) => {
    setValue(v);
    onValueChange?.(v);
  };

  const typed = value.trim();
  const key = catKey(typed);
  const same = typed ? options.find((o) => catKey(o.value) === key) : undefined;
  const shown = useMemo(() => {
    if (!typed) return options.slice(0, 40);
    const q = typed.toLowerCase();
    return options
      .filter((o) => catKey(o.value).includes(key) || o.value.toLowerCase().includes(q) || o.others.some((x) => x.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [options, typed, key]);

  return (
    <div className="relative space-y-1.5">
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && shown.length > 0}
        aria-controls={listId}
        onChange={(e) => {
          set(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-12 z-30 max-h-64 overflow-y-auto rounded-xl border bg-background p-1 shadow-lg"
        >
          {shown.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === typed}>
              <button
                type="button"
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-base hover:bg-secondary ${
                  o.value === typed ? "font-bold text-primary" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  set(o.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{o.value}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{o.count} produk</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {typed && same && same.value !== typed && (
        <p className="text-xs font-semibold text-amber-800">
          Sudah ada “{same.value}”, jadi akan disimpan sebagai “{same.value}”.{" "}
          <button type="button" className="underline" onClick={() => set(same.value)}>
            Pakai “{same.value}”
          </button>
        </p>
      )}
      {typed && !same && !open && (
        <p className="text-xs text-muted-foreground">“{typed}” akan jadi {what} baru.</p>
      )}
    </div>
  );
}
