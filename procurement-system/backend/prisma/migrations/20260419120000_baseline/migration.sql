-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Role" (
    "role_id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "vendor_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "vendor_name" TEXT NOT NULL,
    "company_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "rating" DOUBLE PRECISION,
    "performance_score" DOUBLE PRECISION,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "Category" (
    "category_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Product" (
    "product_id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "warehouse_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "manager_name" TEXT,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("warehouse_id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "inventory_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "max_stock" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("inventory_id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "request_id" SERIAL NOT NULL,
    "pr_number" TEXT,
    "requested_by" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "justification" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "required_date" TIMESTAMP(3),
    "estimated_cost" DECIMAL(65,30),
    "budget_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "ApprovalLog" (
    "log_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "VendorRFQ" (
    "rfq_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "sent_by" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "VendorRFQ_pkey" PRIMARY KEY ("rfq_id")
);

-- CreateTable
CREATE TABLE "VendorQuote" (
    "quote_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "delivery_days" INTEGER,
    "validity_date" TIMESTAMP(3),
    "notes" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "resent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorQuote_pkey" PRIMARY KEY ("quote_id")
);

-- CreateTable
CREATE TABLE "VendorQuoteSubmission" (
    "submission_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "quotation_file_url" TEXT NOT NULL,
    "proforma_file_url" TEXT NOT NULL,
    "quoted_price" DECIMAL(65,30) NOT NULL,
    "quoted_quantity" INTEGER NOT NULL,
    "validity_days" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_remarks" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,

    CONSTRAINT "VendorQuoteSubmission_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "order_id" SERIAL NOT NULL,
    "po_number" TEXT,
    "vendor_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "request_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(65,30) NOT NULL,
    "payment_terms" TEXT,
    "shipping_terms" TEXT,
    "tax_amount" DECIMAL(65,30) DEFAULT 0,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "sent_to_vendor" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "item_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "expected_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "wo_id" SERIAL NOT NULL,
    "wo_number" TEXT NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "request_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "wo_file_url" TEXT,
    "items_description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "agreed_price" DECIMAL(65,30) NOT NULL,
    "delivery_deadline" TIMESTAMP(3) NOT NULL,
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "acknowledged_at" TIMESTAMP(3),
    "dispatched_at" TIMESTAMP(3),
    "tax_invoice_url" TEXT,
    "tax_invoice_number" TEXT,
    "expected_delivery" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("wo_id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "receipt_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "received_by" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "inspection_status" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "receipt_item_id" SERIAL NOT NULL,
    "receipt_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "quantity_received" INTEGER NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'good',

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("receipt_item_id")
);

-- CreateTable
CREATE TABLE "GateEntry" (
    "entry_id" SERIAL NOT NULL,
    "entry_number" TEXT NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "recorded_by" INTEGER NOT NULL,
    "vehicle_number" TEXT NOT NULL,
    "driver_name" TEXT NOT NULL,
    "num_packages" INTEGER NOT NULL,
    "tax_invoice_number" TEXT NOT NULL,
    "invoice_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "block_reason" TEXT,
    "gate_pass_issued" BOOLEAN NOT NULL DEFAULT false,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateEntry_pkey" PRIMARY KEY ("entry_id")
);

-- CreateTable
CREATE TABLE "BillingDocument" (
    "doc_id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "scanned_invoice_url" TEXT,
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMP(3),
    "watchman_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "watchman_confirmed_by" INTEGER,
    "watchman_confirmed_at" TIMESTAMP(3),
    "admin_signed" BOOLEAN NOT NULL DEFAULT false,
    "admin_signed_by" INTEGER,
    "admin_signed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accountant_verified" BOOLEAN NOT NULL DEFAULT false,
    "accountant_verified_by" INTEGER,
    "accountant_verified_at" TIMESTAMP(3),
    "bill_released" BOOLEAN NOT NULL DEFAULT false,
    "bill_released_at" TIMESTAMP(3),
    "accountant_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingDocument_pkey" PRIMARY KEY ("doc_id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "invoice_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "payment_id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "transaction_id" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "ReturnOrder" (
    "return_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "raised_by" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "credit_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnOrder_pkey" PRIMARY KEY ("return_id")
);

-- CreateTable
CREATE TABLE "VendorPortalAction" (
    "action_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPortalAction_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "Warranty" (
    "warranty_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "serial_number" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("warranty_id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscription_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "service_name" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "audit_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "table_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "budget_id" SERIAL NOT NULL,
    "department" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "spent_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reserved_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("budget_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_name_key" ON "Role"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_user_id_key" ON "Vendor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_product_id_warehouse_id_key" ON "Inventory"("product_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_pr_number_key" ON "PurchaseRequest"("pr_number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_po_number_key" ON "PurchaseOrder"("po_number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_request_id_key" ON "PurchaseOrder"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_wo_number_key" ON "WorkOrder"("wo_number");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_submission_id_key" ON "WorkOrder"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "GateEntry_entry_number_key" ON "GateEntry"("entry_number");

-- CreateIndex
CREATE UNIQUE INDEX "GateEntry_wo_id_key" ON "GateEntry"("wo_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDocument_entry_id_key" ON "BillingDocument"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_order_id_key" ON "Invoice"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoice_id_key" ON "Payment"("invoice_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLog" ADD CONSTRAINT "ApprovalLog_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLog" ADD CONSTRAINT "ApprovalLog_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRFQ" ADD CONSTRAINT "VendorRFQ_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRFQ" ADD CONSTRAINT "VendorRFQ_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRFQ" ADD CONSTRAINT "VendorRFQ_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuoteSubmission" ADD CONSTRAINT "VendorQuoteSubmission_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuoteSubmission" ADD CONSTRAINT "VendorQuoteSubmission_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuoteSubmission" ADD CONSTRAINT "VendorQuoteSubmission_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PurchaseOrder"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "VendorQuoteSubmission"("submission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PurchaseOrder"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "GoodsReceipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "WorkOrder"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "GateEntry"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_watchman_confirmed_by_fkey" FOREIGN KEY ("watchman_confirmed_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_admin_signed_by_fkey" FOREIGN KEY ("admin_signed_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_accountant_verified_by_fkey" FOREIGN KEY ("accountant_verified_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PurchaseOrder"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PurchaseOrder"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPortalAction" ADD CONSTRAINT "VendorPortalAction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "PurchaseOrder"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPortalAction" ADD CONSTRAINT "VendorPortalAction_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
