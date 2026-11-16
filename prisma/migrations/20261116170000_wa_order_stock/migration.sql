-- Ready Stock in a web WhatsApp order is set aside when the order is sent.
ALTER TABLE "WaOrder" ADD COLUMN IF NOT EXISTS "stockTaken" BOOLEAN NOT NULL DEFAULT false;
