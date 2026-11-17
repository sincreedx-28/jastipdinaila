-- Owner-only trip costs per PO Event, for the profit report. Additive.
ALTER TABLE "PoEvent" ADD COLUMN IF NOT EXISTS "tripCosts" JSONB NOT NULL DEFAULT '[]';
