"use client";

import { Input } from "@/components/ui/input";

/**
 * Product search that also takes scanner input: everything is selected on
 * focus, so a new scan replaces the previous code instead of appending.
 */
export function SearchBox({ defaultValue }: { defaultValue: string }) {
  return (
    <Input
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder="Cari nama produk, atau scan barcode"
      className="rounded-full!"
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}
