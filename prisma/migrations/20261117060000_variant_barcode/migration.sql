-- Barcode per variant (unique across the shop). Additive.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
