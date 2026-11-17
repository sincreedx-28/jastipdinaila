import { prisma } from "@/lib/prisma";

// Owner-only: how much money is sitting in Ready Stock right now.
// "Modal" = stock × average purchase cost (modal rata-rata) per variant;
// "Jual" = stock × selling price. Hidden products count too: the goods are
// still on the shelf. Variants without a purchase cost yet can't be valued
// at cost, so they're reported separately instead of counted as Rp0.

export type InventoryRow = {
  key: string;
  label: string;
  pcs: number;
  modal: number;
  jual: number;
  /** pcs whose purchase cost isn't filled in yet. */
  noCostPcs: number;
};

export type Inventory = {
  pcs: number;
  products: number;
  modal: number;
  jual: number;
  /** Selling value of the pcs that do have a cost, minus their cost. */
  calonUntung: number;
  noCostPcs: number;
  noCostJual: number;
  byGroup: InventoryRow[];
  byProduct: (InventoryRow & { productId: string; hidden: boolean })[];
};

const NO_GROUP = "Belum dikategorikan";

export async function buildInventory(): Promise<Inventory> {
  const variants = await prisma.productVariant.findMany({
    where: { stockQty: { gt: 0 }, product: { type: "READY" } },
    select: {
      name: true,
      stockQty: true,
      price: true,
      avgCost: true,
      product: { select: { id: true, name: true, group: true, isActive: true } },
    },
  });

  const groups = new Map<string, InventoryRow>();
  const products = new Map<string, InventoryRow & { productId: string; hidden: boolean }>();
  const inv: Inventory = {
    pcs: 0,
    products: 0,
    modal: 0,
    jual: 0,
    calonUntung: 0,
    noCostPcs: 0,
    noCostJual: 0,
    byGroup: [],
    byProduct: [],
  };

  const add = (row: InventoryRow, pcs: number, modal: number, jual: number, noCost: number) => {
    row.pcs += pcs;
    row.modal += modal;
    row.jual += jual;
    row.noCostPcs += noCost;
  };

  for (const v of variants) {
    const pcs = v.stockQty ?? 0;
    const hasCost = v.avgCost !== null;
    const modal = hasCost ? pcs * v.avgCost! : 0;
    const jual = pcs * v.price;
    const noCost = hasCost ? 0 : pcs;

    inv.pcs += pcs;
    inv.modal += modal;
    inv.jual += jual;
    if (hasCost) inv.calonUntung += jual - modal;
    else {
      inv.noCostPcs += pcs;
      inv.noCostJual += jual;
    }

    const g = v.product.group?.trim() || NO_GROUP;
    if (!groups.has(g)) groups.set(g, { key: g, label: g, pcs: 0, modal: 0, jual: 0, noCostPcs: 0 });
    add(groups.get(g)!, pcs, modal, jual, noCost);

    const p = v.product;
    if (!products.has(p.id)) {
      products.set(p.id, {
        key: p.id,
        productId: p.id,
        label: p.name,
        hidden: !p.isActive,
        pcs: 0,
        modal: 0,
        jual: 0,
        noCostPcs: 0,
      });
    }
    add(products.get(p.id)!, pcs, modal, jual, noCost);
  }

  const byValue = (a: InventoryRow, b: InventoryRow) => b.modal - a.modal || b.jual - a.jual;
  inv.byGroup = [...groups.values()].sort(byValue);
  inv.byProduct = [...products.values()].sort(byValue);
  inv.products = products.size;
  return inv;
}
