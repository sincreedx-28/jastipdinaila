"use client";

import { useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import type { RekapResult } from "@/lib/actions/rekap";

export type Buyer = { id: string; name: string; phone: string };

/**
 * Runs a Rekap server action with a pending flag; shows its error as a toast
 * (or a success message if given). The page refreshes itself afterwards
 * because every action revalidates /admin/rekap.
 */
export function useRekapAction() {
  const [pending, startTransition] = useTransition();
  function run<T extends object>(
    fn: () => Promise<RekapResult<T>>,
    opts: { success?: string; onOk?: (r: { ok: true } & T) => void } = {}
  ) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (opts.success) toast.success(opts.success);
      opts.onOk?.(r);
    });
  }
  return { pending, run };
}

/** Big, thumb-friendly − n + stepper. */
export function Stepper({
  value,
  onChange,
  min = 1,
  label,
  sub,
  disabled,
}: {
  value: number;
  onChange: (delta: number) => void;
  min?: number;
  label: string;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center rounded-xl border bg-background">
      <button
        type="button"
        aria-label={`Kurangi ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(-1)}
        className="flex h-11 w-11 items-center justify-center text-xl font-bold disabled:opacity-30"
      >
        −
      </button>
      <div className="min-w-10 text-center leading-tight">
        <b className="text-lg">{value}</b>
        {sub && <span className="block text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      <button
        type="button"
        aria-label={`Tambah ${label}`}
        disabled={disabled}
        onClick={() => onChange(1)}
        className="flex h-11 w-11 items-center justify-center text-xl font-bold disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/** Copies text to the clipboard with a toast; falls back to a prompt. */
export async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} disalin. Tinggal tempel di WhatsApp.`);
  } catch {
    window.prompt("Salin teks ini:", text);
  }
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="box p-8 text-center text-muted-foreground">{children}</p>;
}

// Remembers small UI choices (like the open tab) on this device.
const listeners = new Set<() => void>();
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function useStoredChoice<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const stored = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => readStored(key),
    () => null
  );
  const value = stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : initial;
  const set = (v: T) => {
    try {
      localStorage.setItem(key, v);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [value, set] as const;
}
