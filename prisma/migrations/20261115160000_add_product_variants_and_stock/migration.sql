-- Per-variant price/stock/average cost and a stock movement log.
-- Purely additive: the old "Product"."variants" text[] column is left in
-- place so code that still reads it keeps working.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "stockQty" INTEGER,
    "avgCost" INTEGER,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "stockAfter" INTEGER NOT NULL,
    "avgCostAfter" INTEGER,
    "note" TEXT,
    "adminUserId" TEXT,
    "adminName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "costSnapshot" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_name_key" ON "ProductVariant"("productId", "name");
CREATE INDEX IF NOT EXISTS "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: one variant row per old label (all at the product price), or a
-- single unnamed variant for products without labels. Old stock was not
-- tracked per label, so a READY product's whole stock goes to its first
-- variant; the others start at 0 and should be checked by the admin.
INSERT INTO "ProductVariant" ("id", "productId", "name", "sortOrder", "price", "stockQty")
SELECT
  p."id" || '_v' || v.ord,
  p."id",
  btrim(v.label),
  (v.ord - 1)::int,
  p."price",
  CASE WHEN p."type" = 'READY' THEN (CASE WHEN v.ord = 1 THEN COALESCE(p."stockQty", 0) ELSE 0 END) ELSE NULL END
FROM "Product" p
CROSS JOIN LATERAL unnest(
  CASE WHEN cardinality(p."variants") > 0 THEN p."variants" ELSE ARRAY['']::text[] END
) WITH ORDINALITY AS v(label, ord)
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p."id")
ON CONFLICT ("productId", "name") DO NOTHING;

-- Link past order lines to the variant they named, where it still exists.
UPDATE "OrderItem" oi
SET "variantId" = pv."id"
FROM "ProductVariant" pv
WHERE oi."variantId" IS NULL
  AND oi."productId" = pv."productId"
  AND pv."name" = COALESCE(oi."variantSnapshot", '');
