ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

-- Preserve access for accounts created before approval was introduced.
UPDATE "users" SET "isActive" = true;
