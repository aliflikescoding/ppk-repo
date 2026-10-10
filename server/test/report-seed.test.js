const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { seedReports } = require("../src/scripts/seedReports");
const { uploadRoot } = require("../src/utils/facility-images");
const { removePhoto } = require("../src/utils/report-images");
function database({ populated = false, missing = false, fail = false, custom = false } = {}) {
  const reports = populated ? [{ id: 99, description: "Existing report" }] : [];
  const categories = [{ id: 8, name: "Furniture Damage" }];
  const users = missing ? [] : [{ id: "existing-user" }];
  const facilities = custom ? [{ id: 42, name: "Existing facility" }] : [{ id: 2, name: "Campus Computer Laboratory" }, { id: 1, name: "Campus Meeting Room" }];
  const locks = [];
  const tx = {
    async $executeRawUnsafe(sql) { locks.push(sql); },
    user: { async findMany() { return users; } },
    facility: { async findMany() { return facilities; } },
    report: {
      async count() { return reports.length; },
      async create({ data }) { if (fail && reports.length === 1) throw new Error("Database failure"); reports.push(data); },
    },
    reportCategory: {
      async findFirst({ where }) { return categories.find(item => item.name === where.name); },
      async create({ data }) { const row = { id: 9 + categories.length, ...data }; categories.push(row); return row; },
    },
  };
  return { reports, categories, locks,
    async $transaction(callback) {
      const lengths = [reports.length, categories.length];
      try { return await callback(tx); }
      catch (error) { reports.length = lengths[0]; categories.length = lengths[1]; throw error; }
    },
  };
}
test("report seed skips a populated table even when prerequisites are missing", async () => {
  const db = database({ populated: true, missing: true });
  await seedReports(db);
  assert.deepEqual(db.reports, [{ id: 99, description: "Existing report" }]);
  assert.equal(db.categories.length, 1);
  assert.match(db.locks[0], /LOCK TABLE "reports"/);
});
test("report seed creates new reports with damage photos, reuses categories, and skips reruns", async () => {
  const db = database();
  const urls = [];
  try {
    await seedReports(db);
    assert.equal(db.reports.length, 2);
    assert.equal(db.reports[0].facility_id, 1);
    assert.equal(db.reports[1].facility_id, 2);
    assert.equal(db.reports[0].category_id, 8);
    assert.equal(db.categories.length, 2);
    for (const [index, report] of db.reports.entries()) {
      urls.push(report.photo_report);
      assert.equal(report.status, "new");
      assert.equal(report.user_id, "existing-user");
      assert.match(report.photo_report, /^\/uploads\/reports\/[0-9a-f-]+\.png$/);
      const photo = await fs.readFile(path.join(uploadRoot, report.photo_report.slice('/uploads/'.length)));
      const source = await fs.readFile(path.join(__dirname, '../prisma/seed-assets', index === 0 ? 'damaged-chair.png' : 'damaged-monitor.png'));
      assert.deepEqual(photo, source);
    }
    const snapshot = JSON.stringify(db.reports);
    await seedReports(db);
    assert.equal(JSON.stringify(db.reports), snapshot);
  } finally { for (const url of urls) await removePhoto(url); }
});
test("report seed can use existing custom facilities without creating replacements", async () => {
  const db = database({ custom: true });
  try {
    await seedReports(db);
    assert.ok(db.reports.every(report => report.facility_id === 42));
  } finally { for (const report of db.reports) await removePhoto(report.photo_report); }
});
test("report seed fails cleanly without dependencies or when an insert fails", async () => {
  const missing = database({ missing: true });
  await assert.rejects(seedReports(missing), /requires existing users and facilities/);
  assert.equal(missing.categories.length, 1);
  const directory = path.join(uploadRoot, 'reports');
  await fs.mkdir(directory, { recursive: true });
  const before = (await fs.readdir(directory)).sort();
  const failed = database({ fail: true });
  await assert.rejects(seedReports(failed), /Database failure/);
  assert.equal(failed.reports.length, 0);
  assert.equal(failed.categories.length, 1);
  assert.deepEqual((await fs.readdir(directory)).sort(), before);
});
