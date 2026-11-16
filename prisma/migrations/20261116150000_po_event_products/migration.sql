-- Link Pre-Order products to their PO Event, and allow a photo on
-- hand-typed Rekap items. Additive and idempotent.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "poEventId" TEXT;
ALTER TABLE "PoItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
CREATE INDEX IF NOT EXISTS "Product_poEventId_idx" ON "Product"("poEventId");
DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_poEventId_fkey" FOREIGN KEY ("poEventId") REFERENCES "PoEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rekap items of catalog products are now keyed by product id, so the same
-- product is always one line even if typed differently. Move existing ones.
UPDATE "PoItem" pi
SET "key" = 'p:' || pi."productId" || '|' || split_part(pi."key", '|', 2)
WHERE pi."productId" IS NOT NULL
  AND pi."key" NOT LIKE 'p:%'
  AND NOT EXISTS (
    SELECT 1 FROM "PoItem" o
    WHERE o."eventId" = pi."eventId"
      AND o."key" = 'p:' || pi."productId" || '|' || split_part(pi."key", '|', 2)
  );
