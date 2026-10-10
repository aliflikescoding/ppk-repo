const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-only";
const users = new Map();
function select(user, fields) {
  return fields ? Object.fromEntries(Object.keys(fields).map((key) => [key, user[key]])) : { ...user };
}
const prisma = { user: {
  async findUnique({ where, select: fields }) {
    const user = [...users.values()].find((item) => Object.entries(where).every(([key, value]) => item[key] === value));
    return user ? select(user, fields) : null;
  },
  async create({ data, select: fields }) {
    if ([...users.values()].some((user) => user.email === data.email || user.user_name === data.user_name)) throw { code: "P2002" };
    users.set(data.id, data);
    return select(data, fields);
  },
  async findMany({ select: fields }) { return [...users.values()].map((user) => select(user, fields)); },
  async update({ where, data, select: fields }) {
    if (!users.has(where.id)) throw { code: "P2025" };
    const user = { ...users.get(where.id), ...data };
    users.set(where.id, user);
    return select(user, fields);
  },
  async delete({ where }) {
    if (!users.has(where.id)) throw { code: "P2025" };
    users.delete(where.id);
  },
} };
require.cache[require.resolve("../src/config/prisma")] = { exports: prisma };
const app = express();
app.use(express.json());
app.use("/api/users", require("../src/routes/user.routes"));
const server = app.listen(0, "127.0.0.1");
after(() => new Promise((resolve) => server.close(resolve)));

async function request(path, method = "GET", body, token) {
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

test("user registration, login, permissions, and CRUD", async () => {
  const credentials = { email: "user@example.com", user_name: "user", password: "Password123" };
  assert.equal((await request("/register", "POST", { ...credentials, role: "admin" })).status, 400);
  assert.equal((await request("/register", "POST", { ...credentials, password: "short" })).status, 400);
  const registered = await request("/register", "POST", credentials);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.role, "user");
  assert.equal(registered.body.user.password, undefined);
  const saved = users.get(registered.body.user.id);
  assert.equal(saved.password.length, 60);
  assert.equal(await bcrypt.compare(credentials.password, saved.password), true);
  assert.equal((await request("/register", "POST", credentials)).status, 409);
  assert.equal((await request("/login", "POST", { ...credentials, password: "wrong" })).status, 401);
  const login = await request("/login", "POST", credentials);
  assert.equal(login.status, 200);
  assert.equal(login.body.user.password, undefined);
  const token = login.body.token;
  assert.equal((await request("/me", "GET", undefined, token)).body.user.id, saved.id);
  assert.equal((await request("/")).status, 401);
  assert.equal((await request("/", "GET", undefined, token)).status, 403);
  const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: saved.id, expiresIn: -1 });
  assert.equal((await request("/me", "GET", undefined, expired)).status, 401);

  const adminId = randomUUID();
  users.set(adminId, { id: adminId, email: "admin@example.com", user_name: "admin", role: "admin", password: saved.password });
  const adminToken = jwt.sign({}, process.env.JWT_SECRET, { subject: adminId, expiresIn: "1h" });
  const employee = await request("/", "POST", { email: "employee@example.com", user_name: "employee", password: "Password123", role: "employee" }, adminToken);
  assert.equal(employee.status, 201);
  const id = employee.body.user.id;
  const list = await request("/", "GET", undefined, adminToken);
  assert.equal(list.status, 200);
  assert.ok(list.body.users.every((user) => user.password === undefined));
  assert.equal((await request("/not-a-uuid", "GET", undefined, adminToken)).status, 400);
  assert.equal((await request(`/${id}`, "GET", undefined, adminToken)).status, 200);
  assert.equal((await request(`/${id}`, "PATCH", { role: "invalid" }, adminToken)).status, 400);
  assert.equal((await request(`/${id}`, "PATCH", { password: "NewPassword123", user_name: "updated" }, adminToken)).status, 200);
  assert.equal(await bcrypt.compare("NewPassword123", users.get(id).password), true);
  assert.equal((await request(`/${id}`, "DELETE", undefined, adminToken)).status, 204);
  assert.equal((await request(`/${id}`, "GET", undefined, adminToken)).status, 404);
  users.delete(saved.id);
  assert.equal((await request("/me", "GET", undefined, token)).status, 401);
});

test("admin script creates, promotes, and leaves existing admins unchanged", async () => {
  const vm = require("node:vm");
  const fs = require("node:fs");
  const source = fs.readFileSync(require.resolve("../src/scripts/createAdmin.js"), "utf8");
  async function runAdmin(env) {
    const scriptProcess = { env, exitCode: 0 };
    let finish;
    const done = new Promise((resolve) => { finish = resolve; });
    vm.runInNewContext(source, {
      require: (name) => name === "../config/prisma" ? { ...prisma, $disconnect: async () => finish() }
        : name === "../utils/user" ? require("../src/utils/user") : require(name),
      process: scriptProcess,
      console: { log() {}, error() {} },
    });
    await done;
    return scriptProcess.exitCode;
  }
  const env = { ADMIN_EMAIL: "script@example.com", ADMIN_USER_NAME: "script-admin", ADMIN_PASSWORD: "AdminPassword123" };
  assert.equal(await runAdmin(env), 0);
  const created = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL } });
  assert.equal(created.role, "admin");
  assert.equal(await bcrypt.compare(env.ADMIN_PASSWORD, created.password), true);
  assert.equal(await runAdmin({ ...env, ADMIN_PASSWORD: "DifferentPassword123" }), 0);
  assert.equal(users.get(created.id).password, created.password);
  users.get(created.id).role = "user";
  assert.equal(await runAdmin({ ...env, ADMIN_PASSWORD: "DifferentPassword123" }), 0);
  assert.equal(users.get(created.id).role, "admin");
  assert.equal(await bcrypt.compare("DifferentPassword123", users.get(created.id).password), true);
  assert.equal(await runAdmin({ ...env, ADMIN_PASSWORD: "" }), 1);
});
