const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { seedFacilities } = require("../src/scripts/seedFacilities");
const { uploadRoot, removeImages } = require("../src/utils/facility-images");

function database(populated = false, fail = false) {
  const facilities = populated ? [{ id: 99, name: "Existing facility" }] : [];
  const types = [{ id: 10, name: "Meeting Room" }];
  const locations = [{ id: 20, name: "Main Building" }];
  const locks = [];
  const relation = rows => ({
    async findFirst({ where }) { return rows.find(row => row.name === where.name); },
    async create({ data }) { const row = { id: rows.length + 100, ...data }; rows.push(row); return row; },
  });
  const tx = {
    async $executeRawUnsafe(sql) { locks.push(sql); },
    facility: {
      async count() { return facilities.length; },
      async create({ data }) { if (fail) throw new Error("Database failure"); facilities.push(data); },
    },
    facilityType: relation(types), facilityLocation: relation(locations),
  };
  return {
    facilities, types, locations, locks,
    async $transaction(callback) {
      const lengths = [facilities.length, types.length, locations.length];
      try { return await callback(tx); }
      catch (error) { [facilities, types, locations].forEach((rows, i) => { rows.length = lengths[i]; }); throw error; }
    },
  };
}

test("facility seeder skips any populated table without modifying relations or files", async () => {
  const db = database(true);
  await seedFacilities(db);
  assert.equal(db.facilities.length, 1);
  assert.equal(db.types.length, 1);
  assert.equal(db.locations.length, 1);
  assert.match(db.locks[0], /LOCK TABLE "facilities"/);
});

test("facility seeder creates images, reuses relations, and skips subsequent runs", async () => {
  const db = database();
  const urls = [];
  try {
    await seedFacilities(db);
    assert.equal(db.facilities.length, 2);
    assert.equal(db.types.length, 2);
    assert.equal(db.locations.length, 2);
    assert.equal(db.facilities[0].type_id, 10);
    assert.equal(db.facilities[0].location_id, 20);
    for (const facility of db.facilities) {
      assert.equal(facility.is_active, true);
      const url = facility.images.create.image_url;
      urls.push(url);
      assert.match(url, /^\/uploads\/facilities\/[0-9a-f-]+\.png$/);
      const image = await fs.readFile(path.join(uploadRoot, url.slice('/uploads/'.length)));
      assert.deepEqual(image.subarray(0, 8), Buffer.from([137,80,78,71,13,10,26,10]));
    }
    const snapshot = JSON.stringify(db.facilities);
    await seedFacilities(db);
    assert.equal(JSON.stringify(db.facilities), snapshot);
  } finally { await removeImages(urls); }
});

test("failed facility seed rolls back relations and removes copied files", async () => {
  const directory = path.join(uploadRoot, "facilities");
  await fs.mkdir(directory, { recursive: true });
  const before = (await fs.readdir(directory)).sort();
  const db = database(false, true);
  await assert.rejects(seedFacilities(db), /Database failure/);
  assert.equal(db.facilities.length, 0);
  assert.equal(db.types.length, 1);
  assert.equal(db.locations.length, 1);
  assert.deepEqual((await fs.readdir(directory)).sort(), before);
});
