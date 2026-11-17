-- Optional photo per product variant (e.g. per shade).
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
