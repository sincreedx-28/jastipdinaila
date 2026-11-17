"use client";

import { useRouter } from "next/navigation";

/** "Semua kategori" dropdown on the product list; applies on change. */
export function CategorySelect({
  options,
  value,
  hrefFor,
  label = "Kategori",
  allLabel = "Semua kategori",
  optionLabels,
}: {
  options: string[];
  value: string;
  label?: string;
  allLabel?: string;
  /** Display text per option value (defaults to the value itself). */
  optionLabels?: Record<string, string>;
  /** Pre-built link per option ("" = all), so filters stay server-side. */
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => router.push(hrefFor[e.target.value] ?? hrefFor[""])}
      className="h-11 w-full rounded-xl border bg-background px-3 text-base sm:w-56"
    >
      <option value="">{allLabel}</option>
      {options.map((g) => (
        <option key={g} value={g}>
          {optionLabels?.[g] ?? g}
        </option>
      ))}
    </select>
  );
}
