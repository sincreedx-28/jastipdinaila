export const PRODUCT_CATEGORIES = [
  { value: "FASHION", label: "Fashion", subcategories: ["Top", "Bottom", "One Set", "Abaya"] },
  {
    value: "HIJAB_KHIMAR_SCARVES",
    label: "Hijab, Khimar & Scarves",
    subcategories: ["Square Hijab", "Jumbo Square Hijab", "Khimar Bandana"],
  },
  {
    value: "SKINCARE",
    label: "Skincare",
    subcategories: [
      "Face Wash",
      "Toner",
      "Serum",
      "Eye Mask",
      "Sheet Mask",
      "Lip Care",
      "Eye Care",
      "Moisturizer",
      "Skincare",
    ],
  },
  { value: "MAKE_UP", label: "Make up", subcategories: ["Lip", "Face", "Eye"] },
  { value: "HAIR_BODY_CARE", label: "Hair & Body Care", subcategories: ["Hair Care", "Body Care"] },
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number]["value"];

export function categoryLabel(value: string | null | undefined) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? null;
}

export function subcategoriesFor(value: string | null | undefined) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.subcategories ?? [];
}
