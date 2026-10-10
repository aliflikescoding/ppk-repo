const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "reference-test-secret";
const users = new Map();
const queries = [];
function model() {
  const rows = new Map();
  let sequence = 1;
  return {
    async findMany(args) { queries.push(args); return [...rows.values()]; },
    async count() { return rows.size; },
    async findUnique({ where }) { return rows.get(where.id) || null; },
    async create({ data }) { const record = { id: sequence++, ...data }; rows.set(record.id, record); return record; },
    async update({ where, data }) { if (!rows.has(where.id)) throw { code: "P2025" }; const record = { ...rows.get(where.id), ...data }; rows.set(where.id, record); return record; },
    async delete({ where }) { if (!rows.has(where.id)) throw { code: "P2025" }; if (rows.get(where.id).name === "In use") throw { code: "P2003" }; rows.delete(where.id); },
  };
}
const prisma = {
  user: { async findUnique({ where }) { return users.get(where.id); } },
  facilityType: model(), facilityLocation: model(),
  async $transaction(queries) { return Promise.all(queries); },
};
require.cache[require.resolve("../src/config/prisma")] = { exports: prisma };
const app = express();
app.use(express.json());
app.use('/api/facility-types', require('../src/routes/facility-type.routes'));
app.use('/api/facility-locations', require('../src/routes/facility-location.routes'));
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
function token(role, isActive = true) {
  const id = randomUUID(); users.set(id, { id, role, isActive });
  return jwt.sign({}, process.env.JWT_SECRET, { subject: id });
}
async function request(path, method = 'GET', body, auth) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
for (const [base, singular, plural] of [['facility-types', 'type', 'types'], ['facility-locations', 'location', 'locations']]) {
  test(`${base}: public reads, restricted writes, CRUD, pagination and conflicts`, async () => {
    const admin = token('admin');
    assert.equal((await request(base)).status, 200);
    for (const [path, method] of [[base, 'POST'], [`${base}/1`, 'PATCH'], [`${base}/1`, 'PUT'], [`${base}/1`, 'DELETE']]) {
      assert.equal((await request(path, method, { name: 'Room' })).status, 401);
      for (const role of ['user', 'employee']) assert.equal((await request(path, method, { name: 'Room' }, token(role))).status, 403);
      assert.equal((await request(path, method, { name: 'Room' }, token('admin', false))).status, 403);
    }
    for (const body of [{}, { name: '' }, { name: 'x'.repeat(51) }, { name: 'Room', id: 3 }, []]) assert.equal((await request(base, 'POST', body, admin)).status, 400);
    const created = await request(base, 'POST', { name: '  Room  ' }, admin);
    assert.equal(created.status, 201);
    assert.equal(created.body[singular].name, 'Room');
    const id = created.body[singular].id;
    assert.equal((await request(`${base}/${id}`)).status, 200);
    assert.equal((await request(`${base}/999`)).status, 404);
    assert.equal((await request(`${base}/bad`)).status, 400);
    const listed = await request(`${base}?page=2&limit=5&search=room&sort_by=name&sort_order=desc`);
    assert.equal(listed.body.total, 1);
    assert.ok(Array.isArray(listed.body[plural]));
    assert.deepEqual(queries.at(-1).where, { name: { contains: 'room', mode: 'insensitive' } });
    assert.equal(queries.at(-1).skip, 5);
    assert.deepEqual(queries.at(-1).orderBy, [{ name: 'desc' }, { id: 'asc' }]);
    for (const query of ['limit=101', 'search=a&search=b', 'sort_by=capacity', 'type_id=1']) assert.equal((await request(`${base}?${query}`)).status, 400);
    assert.equal((await request(`${base}/${id}`, 'PUT', { name: 'In use' }, admin)).status, 200);
    assert.equal((await request(`${base}/${id}`, 'DELETE', undefined, admin)).status, 409);
    assert.equal((await request(`${base}/${id}`, 'PATCH', { name: 'Updated' }, admin)).status, 200);
    assert.equal((await request(`${base}/${id}`, 'DELETE', undefined, admin)).status, 204);
    assert.equal((await request(`${base}/${id}`, 'PATCH', { name: 'Missing' }, admin)).status, 404);
  });
}
