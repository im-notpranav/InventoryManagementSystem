-- ════════════════════════════════════════════════════════════════
-- ORDER CYCLE v3
-- Converts existing data to the new flow, then removes old tables/columns.
-- Everything runs in ONE transaction: any failure rolls back fully.
-- Every removed or altered table is first copied into schema "legacy"
-- (plain copies, no constraints) so no old data is lost.
-- TAKE A pg_dump BACKUP BEFORE RUNNING.
-- ════════════════════════════════════════════════════════════════
BEGIN;

-- ── 0. Snapshot old data into schema "legacy" ──────────────────
CREATE SCHEMA IF NOT EXISTS legacy;
CREATE TABLE legacy."PurchaseRequest_v2"       AS TABLE "PurchaseRequest";
CREATE TABLE legacy."PurchaseRequestItem_v2"   AS TABLE "PurchaseRequestItem";
CREATE TABLE legacy."VendorQuoteSubmission_v2" AS TABLE "VendorQuoteSubmission";
CREATE TABLE legacy."WorkOrder_v2"             AS TABLE "WorkOrder";
CREATE TABLE legacy."Inventory_v2"             AS TABLE "Inventory";
CREATE TABLE legacy."Warehouse"                AS TABLE "Warehouse";
CREATE TABLE legacy."VendorQuote"              AS TABLE "VendorQuote";
CREATE TABLE legacy."PurchaseOrder"            AS TABLE "PurchaseOrder";
CREATE TABLE legacy."OrderItem"                AS TABLE "OrderItem";
CREATE TABLE legacy."GoodsReceipt"             AS TABLE "GoodsReceipt";
CREATE TABLE legacy."ReceiptItem"              AS TABLE "ReceiptItem";
CREATE TABLE legacy."GateEntry"                AS TABLE "GateEntry";
CREATE TABLE legacy."BillingDocument"          AS TABLE "BillingDocument";
CREATE TABLE legacy."Invoice"                  AS TABLE "Invoice";
CREATE TABLE legacy."Payment"                  AS TABLE "Payment";
CREATE TABLE legacy."ReturnOrder"              AS TABLE "ReturnOrder";
CREATE TABLE legacy."VendorPortalAction"       AS TABLE "VendorPortalAction";

-- ── 1. Additive schema changes ──────────────────────────────────
ALTER TABLE "Vendor" ADD COLUMN "invite_expires_at" TIMESTAMP(3),
                     ADD COLUMN "invite_token" TEXT;
CREATE UNIQUE INDEX "Vendor_invite_token_key" ON "Vendor"("invite_token");

ALTER TABLE "PurchaseRequest" ADD COLUMN "letter_url" TEXT,
                              ADD COLUMN "rfq_closes_at" TIMESTAMP(3);

ALTER TABLE "VendorQuoteSubmission" RENAME COLUMN "quoted_price" TO "total_price";
ALTER TABLE "VendorQuoteSubmission" ADD COLUMN "expected_delivery" TIMESTAMP(3);

CREATE TABLE "QuotationItem" (
    "quote_item_id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "request_item_id" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("quote_item_id")
);

CREATE TABLE "Shipment" (
    "shipment_id" SERIAL NOT NULL,
    "shipment_number" TEXT NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invoiced',
    "invoice_number" TEXT NOT NULL,
    "invoice_url" TEXT NOT NULL,
    "invoice_amount" DECIMAL(65,30) NOT NULL,
    "invoiced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicle_number" TEXT,
    "expected_arrival" TIMESTAMP(3),
    "num_packages" INTEGER,
    "dispatched_at" TIMESTAMP(3),
    "gate_code" TEXT,
    "received_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_remarks" TEXT,
    "billable_amount" DECIMAL(65,30),
    "bill_approved_by" INTEGER,
    "bill_approved_at" TIMESTAMP(3),
    "accountant_remarks" TEXT,
    "paid_by" INTEGER,
    "payment_date" TIMESTAMP(3),
    "payment_mode" TEXT,
    "payment_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("shipment_id")
);

CREATE TABLE "ShipmentItem" (
    "shipment_item_id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "request_item_id" INTEGER NOT NULL,
    "qty_shipped" INTEGER NOT NULL,
    "qty_accepted" INTEGER,
    "unit_price" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("shipment_item_id")
);

CREATE TABLE "GateCheck" (
    "check_id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "checked_by" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "reason" TEXT,
    "photo_url" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GateCheck_pkey" PRIMARY KEY ("check_id")
);

-- ── 2. Data conversion ──────────────────────────────────────────

-- 2a. Single-product requests → item rows (every request now uses items)
INSERT INTO "PurchaseRequestItem" ("request_id", "product_id", "quantity", "notes")
SELECT pr."request_id", pr."product_id", GREATEST(COALESCE(pr."quantity", 1), 1), NULL
FROM "PurchaseRequest" pr
WHERE pr."product_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PurchaseRequestItem" i WHERE i."request_id" = pr."request_id");

-- 2b. Quotation status: approved+WO → selected, approved without WO → pending (HOD re-selects)
UPDATE "VendorQuoteSubmission" s SET "status" = 'selected'
WHERE s."status" = 'approved'
  AND EXISTS (SELECT 1 FROM "WorkOrder" w WHERE w."submission_id" = s."submission_id");
UPDATE "VendorQuoteSubmission" SET "status" = 'pending' WHERE "status" = 'approved';

-- 2c. Per-item prices for old quotes on single-item requests (total / qty)
INSERT INTO "QuotationItem" ("submission_id", "request_item_id", "unit_price")
SELECT s."submission_id", i."item_id", s."total_price" / GREATEST(i."quantity", 1)
FROM "VendorQuoteSubmission" s
JOIN "PurchaseRequestItem" i ON i."request_id" = s."request_id"
WHERE (SELECT COUNT(*) FROM "PurchaseRequestItem" x WHERE x."request_id" = s."request_id") = 1;

-- 2d. Dispatched work orders → one Shipment each (invoice + dispatch + gate + billing state)
INSERT INTO "Shipment" (
    "shipment_number", "wo_id", "status",
    "invoice_number", "invoice_url", "invoice_amount", "invoiced_at",
    "vehicle_number", "expected_arrival", "num_packages", "dispatched_at", "gate_code",
    "received_at", "reviewed_at", "reviewed_by", "billable_amount",
    "bill_approved_at", "bill_approved_by", "accountant_remarks",
    "created_at", "updated_at")
SELECT
    'SH-' || w."wo_number" || '-1',
    w."wo_id",
    CASE
      WHEN b."bill_released" = true OR b."status" = 'released' THEN 'bill_approved'
      WHEN g."status" = 'verified' THEN 'reviewed'      -- old sign-off steps skipped → accountant
      WHEN g."status" = 'blocked'  THEN 'gate_blocked'  -- HOD can now allow a retry
      ELSE 'dispatched'
    END,
    w."tax_invoice_number",
    COALESCE(w."tax_invoice_url", ''),
    w."agreed_price",
    COALESCE(w."dispatched_at", w."updated_at"),
    g."vehicle_number",
    w."expected_delivery",
    g."num_packages",
    w."dispatched_at",
    CASE WHEN g."entry_id" IS NULL OR g."status" = 'blocked'
         THEN lpad((floor(random() * 1000000))::int::text, 6, '0') END,
    CASE WHEN g."status" = 'verified' THEN g."entry_time" END,
    CASE WHEN g."status" = 'verified' THEN COALESCE(b."admin_signed_at", g."entry_time") END,
    CASE WHEN g."status" = 'verified' THEN b."admin_signed_by" END,
    CASE WHEN g."status" = 'verified' THEN w."agreed_price" END,
    b."accountant_verified_at",
    b."accountant_verified_by",
    b."accountant_remarks",
    COALESCE(w."dispatched_at", w."updated_at"),
    CURRENT_TIMESTAMP
FROM "WorkOrder" w
LEFT JOIN "GateEntry" g ON g."wo_id" = w."wo_id"
LEFT JOIN "BillingDocument" b ON b."entry_id" = g."entry_id"
WHERE w."tax_invoice_number" IS NOT NULL;

-- 2e. Shipment lines: full request qty, accepted in full when the gate verified it
INSERT INTO "ShipmentItem" ("shipment_id", "request_item_id", "qty_shipped", "qty_accepted", "unit_price")
SELECT s."shipment_id", i."item_id", i."quantity",
       CASE WHEN s."status" IN ('reviewed', 'bill_approved') THEN i."quantity" END,
       COALESCE(
         qi."unit_price",
         w."agreed_price" / NULLIF((SELECT SUM(x."quantity") FROM "PurchaseRequestItem" x
                                    WHERE x."request_id" = w."request_id"), 0),
         0)
FROM "Shipment" s
JOIN "WorkOrder" w ON w."wo_id" = s."wo_id"
JOIN "PurchaseRequestItem" i ON i."request_id" = w."request_id"
LEFT JOIN "QuotationItem" qi ON qi."submission_id" = w."submission_id" AND qi."request_item_id" = i."item_id";

-- 2f. Old gate entries → gate check history
INSERT INTO "GateCheck" ("shipment_id", "checked_by", "result", "reason", "checked_at")
SELECT s."shipment_id", g."recorded_by",
       CASE WHEN g."status" = 'verified' THEN 'match' ELSE 'mismatch' END,
       g."block_reason", g."entry_time"
FROM "GateEntry" g
JOIN "Shipment" s ON s."wo_id" = g."wo_id";

-- 2g. Work order status: draft/acknowledged → issued, dispatched → in_delivery, accepted → completed
UPDATE "WorkOrder" SET "status" = 'issued' WHERE "status" IN ('draft', 'issued', 'acknowledged');
UPDATE "WorkOrder" SET "status" = 'in_delivery' WHERE "status" = 'dispatched';
UPDATE "WorkOrder" w SET "status" = 'completed'
WHERE EXISTS (SELECT 1 FROM "Shipment" s WHERE s."wo_id" = w."wo_id"
              AND s."status" IN ('reviewed', 'bill_approved'));

-- 2h. Request status → new chain
UPDATE "PurchaseRequest" SET "status" = 'rfq_sent'
WHERE "status" IN ('quotation_received', 'quotation_approved');
UPDATE "PurchaseRequest" SET "status" = 'in_delivery'
WHERE "status" IN ('dispatched', 'at_gate', 'documents_uploaded', 'ready_for_accountant', 'bill_released');
UPDATE "PurchaseRequest" p SET "status" = 'completed'
WHERE EXISTS (SELECT 1 FROM "WorkOrder" w WHERE w."request_id" = p."request_id" AND w."status" = 'completed');
UPDATE "PurchaseRequest" p SET "status" = 'wo_issued'
WHERE p."status" NOT IN ('completed', 'in_delivery')
  AND EXISTS (SELECT 1 FROM "WorkOrder" w WHERE w."request_id" = p."request_id" AND w."status" = 'issued');

-- 2i. Inventory: merge warehouse rows into one row per product (quantities summed)
WITH agg AS (
  SELECT "product_id",
         MIN("inventory_id")         AS keep_id,
         SUM("quantity_available")   AS qty,
         MAX("reorder_point")        AS rp,
         MAX("min_stock")            AS mn,
         SUM("max_stock")            AS mx
  FROM "Inventory" GROUP BY "product_id"
)
UPDATE "Inventory" i
SET "quantity_available" = agg.qty, "reorder_point" = agg.rp, "min_stock" = agg.mn, "max_stock" = agg.mx
FROM agg WHERE i."inventory_id" = agg.keep_id;

DELETE FROM "Inventory" i
USING (SELECT "product_id", MIN("inventory_id") AS keep_id FROM "Inventory" GROUP BY "product_id") k
WHERE i."product_id" = k."product_id" AND i."inventory_id" <> k.keep_id;

-- ── 3. Remove old constraints, columns and tables ──────────────
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_warehouse_id_fkey";
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_product_id_fkey";
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_warehouse_id_fkey";
DROP INDEX "Inventory_product_id_warehouse_id_key";

ALTER TABLE "Inventory" DROP COLUMN "warehouse_id";

ALTER TABLE "PurchaseRequest" DROP COLUMN "budget_code",
DROP COLUMN "estimated_cost",
DROP COLUMN "justification",
DROP COLUMN "priority",
DROP COLUMN "product_id",
DROP COLUMN "quantity",
DROP COLUMN "warehouse_id";

ALTER TABLE "PurchaseRequestItem" DROP COLUMN "estimated_cost";

ALTER TABLE "VendorQuoteSubmission" DROP COLUMN "proforma_file_url",
DROP COLUMN "quoted_quantity",
DROP COLUMN "validity_days";

ALTER TABLE "WorkOrder" DROP COLUMN "acknowledged_at",
DROP COLUMN "dispatched_at",
DROP COLUMN "expected_delivery",
DROP COLUMN "items_description",
DROP COLUMN "quantity",
DROP COLUMN "tax_invoice_number",
DROP COLUMN "tax_invoice_url",
DROP COLUMN "wo_file_url",
ALTER COLUMN "status" SET DEFAULT 'issued';

-- CASCADE removes the foreign keys between these old tables
DROP TABLE "VendorPortalAction" CASCADE;
DROP TABLE "ReturnOrder" CASCADE;
DROP TABLE "Payment" CASCADE;
DROP TABLE "Invoice" CASCADE;
DROP TABLE "BillingDocument" CASCADE;
DROP TABLE "GateEntry" CASCADE;
DROP TABLE "ReceiptItem" CASCADE;
DROP TABLE "GoodsReceipt" CASCADE;
DROP TABLE "OrderItem" CASCADE;
DROP TABLE "PurchaseOrder" CASCADE;
DROP TABLE "VendorQuote" CASCADE;
DROP TABLE "Warehouse" CASCADE;

-- ── 4. New indexes and foreign keys ─────────────────────────────
CREATE UNIQUE INDEX "QuotationItem_submission_id_request_item_id_key" ON "QuotationItem"("submission_id", "request_item_id");
CREATE UNIQUE INDEX "Shipment_shipment_number_key" ON "Shipment"("shipment_number");
CREATE INDEX "Shipment_gate_code_idx" ON "Shipment"("gate_code");
CREATE UNIQUE INDEX "Inventory_product_id_key" ON "Inventory"("product_id");

ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "VendorQuoteSubmission"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "PurchaseRequestItem"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "WorkOrder"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_bill_approved_by_fkey" FOREIGN KEY ("bill_approved_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("shipment_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "PurchaseRequestItem"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateCheck" ADD CONSTRAINT "GateCheck_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("shipment_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GateCheck" ADD CONSTRAINT "GateCheck_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
