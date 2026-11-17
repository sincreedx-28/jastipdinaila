"use client";

import { createContext, useContext, useState } from "react";

type Selection = { selectedId: string | null; select: (id: string) => void };

const VariantSelection = createContext<Selection | null>(null);

/**
 * Shares the chosen variant between the photo gallery and the buy buttons on
 * the product page, so picking a shade shows that shade's photo.
 */
export function VariantSelectionProvider({
  initialId,
  children,
}: {
  initialId: string | null;
  children: React.ReactNode;
}) {
  const [selectedId, select] = useState(initialId);
  return (
    <VariantSelection.Provider value={{ selectedId, select }}>{children}</VariantSelection.Provider>
  );
}

/** null outside a provider (the buy box then keeps its own choice). */
export function useVariantSelection() {
  return useContext(VariantSelection);
}
