-- Rekap Order (live shopping / WhatsApp orders). Additive and idempotent.

DO $$ BEGIN
  CREATE TYPE "PoEventStatus" AS ENUM ('OPEN', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PoEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PoEventStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PoItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER,
    "got" INTEGER NOT NULL DEFAULT 0,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PoOrder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminName" TEXT,
    CONSTRAINT "PoOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReadySale" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "costSnapshot" INTEGER,
    "adminName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadySale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PoEvent_status_createdAt_idx" ON "PoEvent"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Buyer_nameKey_key" ON "Buyer"("nameKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Buyer_phone_key" ON "Buyer"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "PoItem_eventId_key_key" ON "PoItem"("eventId", "key");
CREATE INDEX IF NOT EXISTS "PoOrder_eventId_createdAt_idx" ON "PoOrder"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "PoOrder_itemId_idx" ON "PoOrder"("itemId");
CREATE INDEX IF NOT EXISTS "PoOrder_buyerId_idx" ON "PoOrder"("buyerId");
CREATE INDEX IF NOT EXISTS "ReadySale_createdAt_idx" ON "ReadySale"("createdAt");
CREATE INDEX IF NOT EXISTS "ReadySale_buyerId_idx" ON "ReadySale"("buyerId");

DO $$ BEGIN
  ALTER TABLE "PoItem" ADD CONSTRAINT "PoItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PoEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PoItem" ADD CONSTRAINT "PoItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PoOrder" ADD CONSTRAINT "PoOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PoEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PoOrder" ADD CONSTRAINT "PoOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PoOrder" ADD CONSTRAINT "PoOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ReadySale" ADD CONSTRAINT "ReadySale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ReadySale" ADD CONSTRAINT "ReadySale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ReadySale" ADD CONSTRAINT "ReadySale_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Keep the public Supabase API key away from these tables (the website
-- itself connects as the database owner and is not affected).
ALTER TABLE "PoEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Buyer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReadySale" ENABLE ROW LEVEL SECURITY;
