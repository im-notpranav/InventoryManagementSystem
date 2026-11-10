-- Departments (2026-11-11)
--   * Every HOD (Admin) and faculty (Department User) moves to CSM(AIML),
--     except the System Admin (admin@college.edu), who becomes the college-wide
--     super admin (department NULL = sees every department).
--   * Inventory becomes per department; all existing stock is CSM(AIML) stock.
-- Old values are copied to schema "legacy" first.
BEGIN;

CREATE SCHEMA IF NOT EXISTS legacy;
CREATE TABLE legacy."User_department_v3" AS SELECT "user_id", "email", "department" FROM "User";
CREATE TABLE legacy."Inventory_v3" AS TABLE "Inventory";

-- ── Users ────────────────────────────────────────────────────
UPDATE "User" u
SET "department" = NULL
FROM "Role" r
WHERE u."role_id" = r."role_id"
  AND r."role_name" = 'Admin'
  AND lower(u."email") = 'admin@college.edu';

UPDATE "User" u
SET "department" = 'CSM(AIML)'
FROM "Role" r
WHERE u."role_id" = r."role_id"
  AND r."role_name" IN ('Admin', 'Department User')
  AND lower(u."email") <> 'admin@college.edu';

-- ── Inventory per department ─────────────────────────────────
ALTER TABLE "Inventory" ADD COLUMN "department" TEXT NOT NULL DEFAULT 'CSM(AIML)';
ALTER TABLE "Inventory" ALTER COLUMN "department" DROP DEFAULT;

DROP INDEX "Inventory_product_id_key";
CREATE UNIQUE INDEX "Inventory_product_id_department_key" ON "Inventory"("product_id", "department");
CREATE INDEX "Inventory_department_idx" ON "Inventory"("department");

COMMIT;
