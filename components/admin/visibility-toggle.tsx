"use client";

import { useOptimistic, useTransition } from "react";
import { toggleProductActive } from "@/lib/actions/products";

/** "Tampil" checkbox: shows or hides a product in the shop right away. */
export function VisibilityToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(isActive);

  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 pr-1 text-sm font-semibold">
      <input
        type="checkbox"
        className="h-5 w-5"
        checked={shown}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setShown(next);
            await toggleProductActive(productId, next);
          });
        }}
      />
      Tampil
    </label>
  );
}
