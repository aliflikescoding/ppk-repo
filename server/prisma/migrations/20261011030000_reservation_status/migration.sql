ALTER TABLE "reservations"
  ADD COLUMN "status" VARCHAR(9) NOT NULL DEFAULT 'new',
  ADD COLUMN "reason" VARCHAR(500);
UPDATE "reservations" SET "status" = 'done' WHERE "isAccepted" = true;
ALTER TABLE "reservations" DROP COLUMN "isAccepted";
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_status_check"
  CHECK ("status" IN ('new', 'processed', 'done', 'rejected'));
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");
CREATE INDEX "reservations_facility_id_status_start_time_end_time_idx"
  ON "reservations"("facility_id", "status", "start_time", "end_time");
