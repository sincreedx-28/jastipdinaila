"use client";

import { useRouter } from "next/navigation";

/** "Semua kategori" dropdown on the product list; applies on change. */
export function CategorySelect({
  options,
  value,
  hrefFor,
}: {
  options: string[];
  value: string;
  /** Pre-built link per option ("" = all), so filters stay server-side. */
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Kategori"
      value={value}
      onChange={(e) => router.push(hrefFor[e.target.value] ?? hrefFor[""])}
      className="h-11 w-full rounded-xl border bg-background px-3 text-base sm:w-56"
    >
      <option value="">Semua kategori</option>
      {options.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}
