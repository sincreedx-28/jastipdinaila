// Category names are free text, so the same category can creep in twice
// ("Skincare" / "Skin care", "Fragrance" / "Fragrances"). catKey() reduces a
// name to a comparison key; names with the same key are treated as one.

export function catKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .replace(/ies$/, "y")
    .replace(/sses$/, "ss")
    .replace(/([^s])s$/, "$1");
}

export type CategoryOption = {
  value: string;
  /** Products using it (all spellings together). */
  count: number;
  /** Other spellings already in use for the same key. */
  others: string[];
  /** For sub-categories: the categories (groups) it appears under. */
  groups?: string[];
};

/**
 * Collapses spellings that share a key into one option, keeping the most
 * used spelling (ties: the first alphabetically), sorted by name.
 */
export function collapseNames(
  rows: { name: string; group?: string | null }[]
): CategoryOption[] {
  const byKey = new Map<string, { counts: Map<string, number>; groups: Set<string> }>();
  for (const { name, group } of rows) {
    const k = catKey(name);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, { counts: new Map(), groups: new Set() });
    const e = byKey.get(k)!;
    e.counts.set(name, (e.counts.get(name) ?? 0) + 1);
    if (group) e.groups.add(group);
  }
  return [...byKey.values()]
    .map(({ counts, groups }) => {
      const spellings = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      return {
        value: spellings[0][0],
        count: spellings.reduce((s, [, n]) => s + n, 0),
        others: spellings.slice(1).map(([n]) => n),
        groups: [...groups],
      };
    })
    .sort((a, b) => a.value.localeCompare(b.value, "id"));
}
