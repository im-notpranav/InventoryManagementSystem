-- Warranty & subscription tracker v2 (2026-11-12)
--   * Subscriptions become standalone (Microsoft 365, Photoshop, Claude, ...):
--     no inventory product link. The old product name is kept in "notes".
--   * Both get a department (existing rows -> CSM(AIML), like existing stock),
--     staged reminders (30 / 7 / 1 day / expiry) instead of the one-time
--     "notified" flag, notes and a document.
--   * Warranties can link to the work order / shipment they came from.
--   * Notifications get a click-through link.
-- Old rows are copied to schema "legacy" first.
BEGIN;

CREATE SCHEMA IF NOT EXISTS legacy;
CREATE TABLE legacy."Warranty_v3" AS TABLE "Warranty";
CREATE TABLE legacy."Subscription_v3" AS TABLE "Subscription";

-- ── Notifications ────────────────────────────────────────────
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
CREATE INDEX "Notification_user_id_sent_at_idx" ON "Notification"("user_id", "sent_at");

-- ── Subscriptions ────────────────────────────────────────────
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_product_id_fkey";

ALTER TABLE "Subscription"
  ADD COLUMN "provider"      TEXT,
  ADD COLUMN "plan"          TEXT,
  ADD COLUMN "department"    TEXT NOT NULL DEFAULT 'CSM(AIML)',
  ADD COLUMN "seats"         INTEGER,
  ADD COLUMN "cost"          DECIMAL(65,30),
  ADD COLUMN "billing_cycle" TEXT NOT NULL DEFAULT 'yearly',
  ADD COLUMN "start_date"    TIMESTAMP(3),
  ADD COLUMN "notes"         TEXT,
  ADD COLUMN "document_url"  TEXT,
  ADD COLUMN "last_reminder" INTEGER,
  ADD COLUMN "renewed_at"    TIMESTAMP(3),
  ADD COLUMN "created_by"    INTEGER,
  ADD COLUMN "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Keep the old product link as a readable note.
UPDATE "Subscription" s
SET "notes" = 'Previously linked to product: ' || p."name"
FROM "Product" p
WHERE p."product_id" = s."product_id";

-- An already-sent alert counts as the 30-day reminder; for an item that has
-- already lapsed it counts as the expiry notice, so nothing is re-sent.
UPDATE "Subscription"
SET "last_reminder" = CASE WHEN "expiry_date" < CURRENT_TIMESTAMP THEN 0 ELSE 30 END
WHERE "notified" = true;

ALTER TABLE "Subscription" DROP COLUMN "notified", DROP COLUMN "product_id";
ALTER TABLE "Subscription" ALTER COLUMN "department" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE INDEX "Subscription_department_idx" ON "Subscription"("department");
CREATE INDEX "Subscription_expiry_date_idx" ON "Subscription"("expiry_date");

-- ── Warranties ───────────────────────────────────────────────
ALTER TABLE "Warranty" DROP CONSTRAINT "Warranty_vendor_id_fkey";

ALTER TABLE "Warranty"
  ADD COLUMN "wo_id"         INTEGER,
  ADD COLUMN "shipment_id"   INTEGER,
  ADD COLUMN "department"    TEXT NOT NULL DEFAULT 'CSM(AIML)',
  ADD COLUMN "quantity"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "notes"         TEXT,
  ADD COLUMN "document_url"  TEXT,
  ADD COLUMN "last_reminder" INTEGER,
  ADD COLUMN "created_by"    INTEGER,
  ADD COLUMN "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "vendor_id" DROP NOT NULL;

UPDATE "Warranty"
SET "last_reminder" = CASE WHEN "end_date" < CURRENT_TIMESTAMP THEN 0 ELSE 30 END
WHERE "notified" = true;

ALTER TABLE "Warranty" DROP COLUMN "notified";
ALTER TABLE "Warranty" ALTER COLUMN "department" DROP DEFAULT;
ALTER TABLE "Warranty" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE INDEX "Warranty_department_idx" ON "Warranty"("department");
CREATE INDEX "Warranty_end_date_idx" ON "Warranty"("end_date");

ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "WorkOrder"("wo_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("shipment_id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
