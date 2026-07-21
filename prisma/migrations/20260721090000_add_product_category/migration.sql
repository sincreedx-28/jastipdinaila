-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FASHION', 'HIJAB_KHIMAR_SCARVES', 'SKINCARE', 'MAKE_UP', 'HAIR_BODY_CARE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory",
ADD COLUMN     "subcategory" TEXT NOT NULL DEFAULT '';
