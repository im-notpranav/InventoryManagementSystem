-- DropForeignKey
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_product_id_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_warehouse_id_fkey";

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "admin_remarks" TEXT,
ALTER COLUMN "product_id" DROP NOT NULL,
ALTER COLUMN "warehouse_id" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "item_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimated_cost" DECIMAL(65,30),
    "notes" TEXT,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("item_id")
);

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "PurchaseRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
