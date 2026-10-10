-- A category can be used by multiple reports.
DROP INDEX "reports_category_id_key";
CREATE INDEX "reports_category_id_idx" ON "reports"("category_id");
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");
