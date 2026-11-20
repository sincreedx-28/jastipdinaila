import { prisma } from "@/lib/prisma";
import { catKey, collapseNames, type CategoryOption } from "@/lib/category";

/** Categories and sub-categories already in use, for the product form. */
export async function getCategoryOptions(): Promise<{
  groups: CategoryOption[];
  categories: CategoryOption[];
}> {
  const rows = await prisma.product.findMany({ select: { group: true, category: true } });
  const groups = collapseNames(rows.filter((r) => r.group?.trim()).map((r) => ({ name: r.group!.trim() })));
  const canonicalGroup = new Map<string, string>();
  for (const g of groups) for (const s of [g.value, ...g.others]) canonicalGroup.set(s, g.value);
  const categories = collapseNames(
    rows
      .filter((r) => r.category?.trim())
      .map((r) => ({ name: r.category!.trim(), group: r.group ? canonicalGroup.get(r.group.trim()) : null }))
  );
  return { groups, categories };
}

/**
 * Saves a typed name in the spelling already used for it, so "skin care"
 * joins the existing "Skincare" instead of starting a second category.
 */
export async function canonicalCategoryNames(group: string | null, category: string | null) {
  if (!group && !category) return { group, category };
  const { groups, categories } = await getCategoryOptions();
  const pick = (name: string | null, opts: CategoryOption[]) =>
    name ? (opts.find((o) => catKey(o.value) === catKey(name))?.value ?? name) : name;
  return { group: pick(group, groups), category: pick(category, categories) };
}
