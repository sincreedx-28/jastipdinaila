-- Orders sent from the web's WhatsApp checkout, waiting for confirmation.
DO $$ BEGIN
  CREATE TYPE "WaOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WaOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "note" TEXT,
    "lines" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "status" "WaOrderStatus" NOT NULL DEFAULT 'PENDING',
    "buyerId" TEXT,
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaOrder_code_key" ON "WaOrder"("code");
CREATE INDEX IF NOT EXISTS "WaOrder_status_createdAt_idx" ON "WaOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "WaOrder_phone_idx" ON "WaOrder"("phone");

DO $$ BEGIN
  ALTER TABLE "WaOrder" ADD CONSTRAINT "WaOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "WaOrder" ENABLE ROW LEVEL SECURITY;
