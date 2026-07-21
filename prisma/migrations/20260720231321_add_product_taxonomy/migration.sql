-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "variants" TEXT[] DEFAULT ARRAY[]::TEXT[];
