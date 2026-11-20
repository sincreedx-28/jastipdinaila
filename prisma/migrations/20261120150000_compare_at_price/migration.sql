-- "Harga coret": optional struck-through price per variant.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "compareAtPrice" INTEGER;
-- Optional expiry month per variant.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "expDate" DATE;
