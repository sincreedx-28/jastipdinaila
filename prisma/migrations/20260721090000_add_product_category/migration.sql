-- CreateEnum (idempotent: redesign/pink-shop-ui shares this same database
-- and this branch may be re-applied after a partial run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
    CREATE TYPE "ProductCategory" AS ENUM ('FASHION', 'HIJAB_KHIMAR_SCARVES', 'SKINCARE', 'MAKE_UP', 'HAIR_BODY_CARE');
  END IF;
END $$;

-- AlterTable
-- Column names deliberately do NOT match redesign/pink-shop-ui's plain-text
-- "category"/"group" columns already present on this shared database.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category_enum" "ProductCategory";
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subcategory_v2" TEXT NOT NULL DEFAULT '';
