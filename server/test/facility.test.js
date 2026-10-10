const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { parseListQuery } = require('../src/utils/facility');
process.env.JWT_SECRET = 'facility-test-secret';
const accounts = new Map();
const calls = [];
let saved;
let conflict = false;
const prisma = {
  user: { async findUnique({ where }) { return accounts.get(where.id); } },
  facilityType: { async findUnique({ where }) { return where.id === 1 ? { id: 1 } : null; } },
  facilityLocation: { async findUnique({ where }) { return where.id === 1 ? { id: 1 } : null; } },
  facility: {
    async findMany(args) { calls.push(args); return saved ? [saved] : []; },
    async count(args) { calls.push(args); return saved ? 1 : 0; },
    async findUnique({ where }) { return saved?.id === where.id ? { ...saved, images: Array.isArray(saved.images) ? saved.images : (saved.images?.create || []) } : null; },
    async create({ data }) { saved = { id: 1, is_active: false, ...data }; return saved; },
    async update({ where, data }) { if (saved?.id !== where.id) throw { code: 'P2025' }; saved = { ...saved, ...data }; return saved; },
    async delete({ where }) { if (saved?.id !== where.id) throw { code: 'P2025' }; if (conflict) throw { code: 'P2003' }; saved = null; },
  },
  facilityImage: { async deleteMany() {} },
  async $transaction(work) { return typeof work === 'function' ? work(prisma) : Promise.all(work); },
};
require.cache[require.resolve('../src/config/prisma')] = { exports: prisma };
const app = express();
app.use(express.json());
app.use('/uploads', express.static(require('../src/utils/facility-images').uploadRoot));
app.use('/api/facilities', require('../src/routes/facility.routes'));
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
async function request(path = '', method = 'GET', body, token) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/facilities${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
function token(role, isActive = true) {
  const id = randomUUID();
  accounts.set(id, { id, role, isActive });
  return jwt.sign({}, process.env.JWT_SECRET, { subject: id });
}
test('facility public reads, staff updates, admin create/delete, validation and CRUD', async () => {
  const admin = token('admin');
  const body = { name: 'Meeting room', capacity: 10, type_id: 1, location_id: 1, image_urls: ['https://example.com/room.jpg'] };
  assert.equal((await request()).status, 200);
  for (const [path, method] of [['', 'POST'], ['/1', 'PATCH'], ['/1', 'PUT'], ['/1', 'DELETE']]) {
    assert.equal((await request(path, method, body)).status, 401);
    for (const role of (['PATCH', 'PUT'].includes(method) ? ['user'] : ['user', 'employee'])) assert.equal((await request(path, method, body, token(role))).status, 403);
    for (const role of ['admin', 'employee']) assert.equal((await request(path, method, body, token(role, false))).status, 403);
  }
  for (const invalid of [{ ...body, capacity: 0 }, { ...body, is_active: 'true' }, { ...body, type_id: 9 }, { ...body, image_urls: ['javascript:alert(1)'] }, { ...body, id: 9 }]) {
    assert.equal((await request('', 'POST', invalid, admin)).status, 400);
  }
  const created = await request('', 'POST', body, admin);
  assert.equal(created.status, 201);
  assert.equal(created.body.facility.is_active, false);
  const employee = token('employee');
  assert.equal((await request('/1', 'PATCH', { name: 'Employee updated' }, employee)).status, 200);
  assert.equal((await request('/1', 'PUT', { capacity: 25, type_id: 1, location_id: 1, is_active: true }, employee)).status, 200);
  assert.equal(saved.capacity, 25);
  assert.equal(saved.is_active, true);
  assert.equal((await request('/1', 'PATCH', { capacity: -1 }, employee)).status, 400);
  assert.equal((await request('/1')).status, 200);
  assert.equal((await request('/999')).status, 404);
  assert.equal((await request('/bad')).status, 400);
  const list = await request('?search=ROOM&type_id=1&location_id=1&is_active=false&min_capacity=5&max_capacity=20&sort_by=name&sort_order=desc&page=1&limit=5');
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.total_pages, 1);
  assert.equal(list.body.has_next, false);
  const [many, count] = calls.slice(-2);
  assert.deepEqual(many.where, count.where);
  assert.equal(many.where.OR[0].name.mode, 'insensitive');
  assert.deepEqual(many.orderBy, [{ name: 'desc' }, { id: 'asc' }]);
  assert.equal(many.take, 5);
  assert.equal((await request('/1', 'PATCH', {}, admin)).status, 400);
  const updated = await request('/1', 'PATCH', { is_active: true, image_urls: [] }, admin);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.facility.is_active, true);
  assert.deepEqual(saved.images, { deleteMany: {}, create: [] });
  assert.equal((await request('/999', 'PATCH', { name: 'Missing' }, admin)).status, 404);
  conflict = true;
  assert.equal((await request('/1', 'DELETE', undefined, admin)).status, 409);
  conflict = false;
  assert.equal((await request('/1', 'DELETE', undefined, admin)).status, 204);
  assert.equal((await request('/1')).status, 404);
});
test('query bounds, pagination and invalid query input', () => {
  for (const query of [{ page: '0' }, { limit: '101' }, { page: '2147483647' }, { type_id: 'x' }, { is_active: '1' }, { min_capacity: '20', max_capacity: '10' }, { sort_by: 'password' }, { sort_order: 'invalid' }, { search: ['a', 'b'] }, { unknown: '1' }]) {
    assert.throws(() => parseListQuery(query));
  }
  const query = parseListQuery({ page: '3', limit: '10' });
  assert.equal((query.page - 1) * query.limit, 20);
  assert.deepEqual(parseListQuery({}).orderBy, [{ id: 'asc' }]);
});

test('multipart uploads, public image access, replacement and deletion cleanup', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { uploadRoot } = require('../src/utils/facility-images');
  const admin = token('admin');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  async function multipart(method, fields, files, auth = admin) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    for (const file of files) form.append('images', new Blob([file.bytes], { type: file.type }), file.name || 'room.png');
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/facilities${method === 'POST' ? '' : '/1'}`, {
      method, headers: auth ? { Authorization: `Bearer ${auth}` } : {}, body: form,
    });
    return { status: res.status, body: await res.json() };
  }
  const fields = { name: 'Uploaded room', capacity: '20', type_id: '1', location_id: '1', is_active: 'true' };
  const file = { bytes: png, type: 'image/png', name: '../../room.png' };
  assert.equal((await multipart('POST', fields, [file], null)).status, 401);
  assert.equal((await multipart('POST', fields, [{ bytes: 'fake image', type: 'image/png' }])).status, 400);
  assert.equal((await multipart('POST', fields, [{ bytes: Buffer.alloc(5 * 1024 * 1024 + 1), type: 'image/png' }])).status, 413);
  assert.equal((await multipart('POST', { ...fields, image_urls: '[]' }, [file])).status, 400);
  const created = await multipart('POST', fields, [file]);
  assert.equal(created.status, 201);
  assert.equal(created.body.facility.capacity, 20);
  assert.equal(created.body.facility.is_active, true);
  const first = saved.images.create[0].image_url;
  const diskPath = url => path.join(uploadRoot, url.slice('/uploads/'.length));
  assert.deepEqual(await fs.readFile(diskPath(first)), png);
  const publicImage = await fetch(`http://127.0.0.1:${server.address().port}${first}`);
  assert.equal(publicImage.status, 200);
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), png);
  const replaced = await multipart('PATCH', {}, [file], token('employee'));
  assert.equal(replaced.status, 200);
  const second = saved.images.create[0].image_url;
  assert.notEqual(first, second);
  await assert.rejects(fs.access(diskPath(first)), { code: 'ENOENT' });
  conflict = true;
  assert.equal((await request('/1', 'DELETE', undefined, admin)).status, 409);
  await fs.access(diskPath(second));
  conflict = false;
  assert.equal((await request('/1', 'DELETE', undefined, admin)).status, 204);
  await assert.rejects(fs.access(diskPath(second)), { code: 'ENOENT' });
  const before = await fs.readdir(path.join(uploadRoot, 'facilities'));
  const originalCreate = prisma.facility.create;
  prisma.facility.create = async () => { throw { code: 'P2003' }; };
  try { assert.equal((await multipart('POST', fields, [file])).status, 409); }
  finally { prisma.facility.create = originalCreate; }
  assert.deepEqual(await fs.readdir(path.join(uploadRoot, 'facilities')), before);
});
