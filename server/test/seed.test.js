const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const bcrypt = require("bcrypt");

test("user seeder skips populated tables and hashes passwords for empty tables", async () => {
  const existing = { id: "existing", email: "someone@example.com", user_name: "user1", role: "admin", password: "existing-hash" };
  const users = [{ ...existing }];
  let facilitySeedRuns = 0;
  async function run(env = {}) {
    const scriptProcess = { env, exitCode: 0 };
    let finish;
    const done = new Promise((resolve) => { finish = resolve; });
    const prisma = {
      user: {
        async count() { return users.length; },
        async createMany({ data, skipDuplicates }) {
          assert.equal(skipDuplicates, true);
          let count = 0;
          for (const account of data) {
            if (users.some((user) => user.email === account.email || user.user_name === account.user_name)) continue;
            users.push({ ...account });
            count++;
          }
          return { count };
        },
      },
      async $disconnect() { finish(); },
    };
    vm.runInNewContext(readFileSync(require.resolve("../src/scripts/seed.js"), "utf8"), {
      require: (name) => name === "../config/prisma" ? prisma
        : name === "./seedFacilities" ? { seedFacilities: async (client) => { assert.equal(client, prisma); facilitySeedRuns++; } }
        : name === "../utils/user" ? require("../src/utils/user") : require(name),
      process: scriptProcess,
      console: { log() {}, error() {} },
    });
    await done;
    return scriptProcess.exitCode;
  }
  assert.equal(await run(), 0);
  assert.equal(facilitySeedRuns, 1);
  assert.equal(users.length, 1);
  assert.deepEqual(users[0], existing);
  const snapshot = users.map((user) => ({ ...user }));
  assert.equal(await run({ SEED_PASSWORD: "OtherPassword123" }), 0);
  assert.deepEqual(users, snapshot);
  assert.equal(await run({ SEED_PASSWORD: "short" }), 0);
  assert.deepEqual(users, snapshot);
  users.length = 0;
  assert.equal(await run({ SEED_PASSWORD: "short" }), 1);
  assert.equal(users.length, 0);
  assert.equal(await run({ SEED_PASSWORD: "CustomPassword123" }), 0);
  assert.equal(facilitySeedRuns, 4);
  assert.equal(users.length, 4);
  assert.equal(await bcrypt.compare("CustomPassword123", users[0].password), true);
});
