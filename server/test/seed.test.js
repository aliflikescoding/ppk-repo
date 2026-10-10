const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const bcrypt = require("bcrypt");

test("seeder preserves populated tables, skips conflicts, and hashes passwords", async () => {
  const existing = { id: "existing", email: "someone@example.com", user_name: "user1", role: "admin", password: "existing-hash" };
  const users = [{ ...existing }];
  async function run(env = {}) {
    const scriptProcess = { env, exitCode: 0 };
    let finish;
    const done = new Promise((resolve) => { finish = resolve; });
    const prisma = {
      user: {
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
        : name === "../utils/user" ? require("../src/utils/user") : require(name),
      process: scriptProcess,
      console: { log() {}, error() {} },
    });
    await done;
    return scriptProcess.exitCode;
  }
  assert.equal(await run(), 0);
  assert.equal(users.length, 4);
  assert.deepEqual(users[0], existing);
  assert.equal(users.filter((user) => user.role === "employee").length, 2);
  for (const user of users.slice(1)) {
    assert.match(user.id, /^[0-9a-f-]{36}$/);
    assert.equal(await bcrypt.compare("Password123", user.password), true);
  }
  const snapshot = users.map((user) => ({ ...user }));
  assert.equal(await run({ SEED_PASSWORD: "OtherPassword123" }), 0);
  assert.deepEqual(users, snapshot);
  assert.equal(await run({ SEED_PASSWORD: "short" }), 1);
  assert.deepEqual(users, snapshot);
  users.length = 0;
  assert.equal(await run({ SEED_PASSWORD: "CustomPassword123" }), 0);
  assert.equal(users.length, 4);
  assert.equal(await bcrypt.compare("CustomPassword123", users[0].password), true);
});
