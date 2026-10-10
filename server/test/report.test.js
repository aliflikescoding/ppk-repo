const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'report-test-secret';
const users = new Map(), reports = new Map(), categories = new Map();
let sequence = 1, categorySequence = 1;
const queries = [];
function matches(row, where) { return Object.entries(where).every(([key, value]) => key === 'OR' || row[key] === value); }
function include(row) {
  if (!row) return null;
  const user = users.get(row.user_id);
  return { ...row, user: { id: user.id, role: user.role }, facility: { id: row.facility_id }, category: categories.get(row.category_id) };
}
const prisma = {
  user: { async findUnique({ where }) { return users.get(where.id); } },
  facility: { async findUnique({ where }) { return where.id === 1 ? { id: 1 } : null; } },
  reportCategory: {
    async findUnique({ where }) { return categories.get(where.id) || null; },
    async findMany() { return [...categories.values()]; },
    async count() { return categories.size; },
    async create({ data }) { const row = { id: categorySequence++, ...data }; categories.set(row.id, row); return row; },
    async update({ where, data }) { if (!categories.has(where.id)) throw { code: 'P2025' }; const row = { ...categories.get(where.id), ...data }; categories.set(row.id, row); return row; },
    async delete({ where }) { if (!categories.has(where.id)) throw { code: 'P2025' }; if ([...reports.values()].some(row => row.category_id === where.id)) throw { code: 'P2003' }; categories.delete(where.id); },
  },
  report: {
    async create({ data }) { const row = { id: sequence++, reaseon: null, ...data }; reports.set(row.id, row); return include(row); },
    async findFirst({ where }) { return include([...reports.values()].find(row => matches(row, where))); },
    async findMany(args) { queries.push(args); return [...reports.values()].filter(row => matches(row, args.where)).slice(args.skip, args.skip + args.take).map(include); },
    async count({ where }) { return [...reports.values()].filter(row => matches(row, where)).length; },
    async update({ where, data }) { if (!reports.has(where.id)) throw { code: 'P2025' }; const row = { ...reports.get(where.id), ...data }; reports.set(row.id, row); return include(row); },
    async delete({ where }) { if (!reports.has(where.id)) throw { code: 'P2025' }; const row = reports.get(where.id); reports.delete(where.id); return row; },
  },
  async $transaction(work) { return Promise.all(work); },
};
require.cache[require.resolve('../src/config/prisma')] = { exports: prisma };
const app = express(); app.use(express.json());
app.use('/uploads', express.static(require('../src/utils/facility-images').uploadRoot));
app.use('/api/reports', require('../src/routes/report.routes'));
app.use('/api/report-categories', require('../src/routes/report-category.routes'));
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
function account(role, active = true) {
  const id = randomUUID(); users.set(id, { id, role, isActive: active, password: 'must-never-leak' });
  return { id, token: jwt.sign({}, process.env.JWT_SECRET, { subject: id }) };
}
async function request(path, method = 'GET', body, auth) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
test('category lists are public, category writes are admin-only, reports enforce ownership and staff permissions', async () => {
  const admin = account('admin'), employee = account('employee'), user = account('user'), other = account('user');
  assert.equal((await request('report-categories')).status, 200);
  for (const auth of [employee, user]) assert.equal((await request('report-categories', 'GET', undefined, auth)).status, 200);
  for (const [path, method, body] of [['report-categories/1', 'GET'], ['report-categories', 'POST', { name: 'Damage' }], ['report-categories/1', 'PATCH', { name: 'Damage' }], ['report-categories/1', 'DELETE']]) {
    assert.equal((await request(path, method, body)).status, 401);
    for (const auth of [employee, user]) assert.equal((await request(path, method, body, auth)).status, 403);
  }
  const category = await request('report-categories', 'POST', { name: 'Damage' }, admin);
  assert.equal(category.status, 201);
  const categoryId = category.body.category.id;
  const publicList = await request('report-categories?search=Damage');
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body.categories[0].id, categoryId);
  assert.equal((await request(`report-categories/${categoryId}`, 'GET', undefined, admin)).status, 200);
  assert.equal((await request('report-categories?search=Damage', 'GET', undefined, admin)).body.total, 1);
  assert.equal((await request(`report-categories/${categoryId}`, 'PATCH', { name: 'Maintenance' }, admin)).status, 200);
  const body = { facility_id: 1, category_id: categoryId, description: 'Broken chair', photo_report: 'https://example.com/chair.jpg' };
  assert.equal((await request('reports', 'POST', body)).status, 401);
  assert.equal((await request('reports', 'POST', body, account('user', false))).status, 403);
  for (const invalid of [{ ...body, user_id: other.id }, { ...body, status: 'done' }, { ...body, facility_id: 999 }, { ...body, category_id: 999 }, { ...body, description: '' }, { ...body, photo_report: 'javascript:alert(1)' }]) assert.equal((await request('reports', 'POST', invalid, user)).status, 400);
  const created = await request('reports', 'POST', body, user);
  assert.equal(created.status, 201);
  assert.equal(created.body.report.status, 'new');
  assert.equal(created.body.report.user_id, user.id);
  assert.equal(created.body.report.user.password, undefined);
  const id = created.body.report.id;
  // Reusing a category is valid for multiple reports.
  assert.equal((await request('reports', 'POST', body, employee)).status, 201);
  assert.equal((await request('reports', 'POST', body, admin)).status, 201);
  assert.equal((await request('reports', 'GET', undefined, user)).body.total, 1);
  assert.equal((await request('reports', 'GET', undefined, employee)).body.total, 3);
  assert.equal((await request('reports/me', 'GET', undefined, employee)).body.total, 1);
  assert.equal((await request(`reports/user/${user.id}`, 'GET', undefined, admin)).body.total, 1);
  assert.equal((await request(`reports/user/${user.id}`, 'GET', undefined, user)).body.total, 1);
  assert.equal((await request(`reports/user/${other.id}`, 'GET', undefined, user)).status, 403);
  assert.equal((await request(`reports/${id}`, 'GET', undefined, other)).status, 404);
  assert.equal((await request(`reports/${id}`, 'GET', undefined, user)).status, 200);
  for (const method of ['PATCH', 'PUT', 'DELETE']) assert.equal((await request(`reports/${id}`, method, { status: 'done' }, user)).status, 403);
  assert.equal((await request(`reports/${id}`, 'DELETE', undefined, employee)).status, 403);
  const updated = await request(`reports/${id}`, 'PATCH', { status: 'rejected', reason: 'Duplicate' }, employee);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.report.reason, 'Duplicate');
  assert.equal(updated.body.report.reaseon, undefined);
  assert.equal((await request(`reports/${id}`, 'PUT', { status: 'processed', reason: null }, admin)).status, 200);
  assert.equal((await request(`reports/${id}`, 'PATCH', { status: false }, employee)).status, 400);
  assert.equal((await request(`reports/${id}`, 'PATCH', {}, employee)).status, 400);
  assert.equal((await request('reports/999', 'PATCH', { status: 'done' }, employee)).status, 404);
  for (const path of ['reports/bad', 'reports/user/bad', 'reports?limit=101', 'reports?status=false', 'reports?search=a&search=b', 'reports?category_id=0', 'reports?sort_by=password']) assert.equal((await request(path, 'GET', undefined, admin)).status, 400);
  await request('reports?search=chair&status=processed&facility_id=1&category_id=1&page=2&limit=5&sort_by=status&sort_order=asc', 'GET', undefined, admin);
  assert.equal(queries.at(-1).skip, 5);
  assert.equal(queries.at(-1).where.status, 'processed');
  assert.equal(queries.at(-1).where.OR[0].description.mode, 'insensitive');
  assert.equal((await request(`report-categories/${categoryId}`, 'DELETE', undefined, admin)).status, 409);
  for (const reportId of [...reports.keys()]) assert.equal((await request(`reports/${reportId}`, 'DELETE', undefined, admin)).status, 204);
  assert.equal((await request(`reports/${id}`, 'GET', undefined, user)).status, 404);
  assert.equal((await request(`report-categories/${categoryId}`, 'DELETE', undefined, admin)).status, 204);
});

test('report multipart photos: validation, permissions, serving and file lifecycle', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { uploadRoot } = require('../src/utils/facility-images');
  const admin = account('admin'), employee = account('employee'), user = account('user');
  const category = await request('report-categories', 'POST', { name: 'Upload test' }, admin);
  const fields = { facility_id: '1', category_id: String(category.body.category.id), description: 'Broken chair' };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  async function multipart(route, method, body, files, auth = user) {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) form.append(key, value);
    for (const file of files) form.append(file.field || 'photo_report', new Blob([file.bytes], { type: file.type || 'image/png' }), '../../photo.png');
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/reports${route}`, {
      method, headers: auth ? { Authorization: `Bearer ${auth.token}` } : {}, body: form,
    });
    return { status: res.status, body: await res.json() };
  }
  const file = { bytes: png };
  const diskPath = url => path.join(uploadRoot, url.slice('/uploads/'.length));
  assert.equal((await multipart('', 'POST', fields, [file], null)).status, 401);
  assert.equal((await multipart('', 'POST', fields, [{ bytes: 'fake PNG' }])).status, 400);
  assert.equal((await multipart('', 'POST', fields, [{ bytes: Buffer.alloc(5 * 1024 * 1024 + 1) }])).status, 413);
  assert.equal((await multipart('', 'POST', fields, [file, file])).status, 400);
  assert.equal((await multipart('', 'POST', fields, [{ ...file, field: 'images' }])).status, 400);
  assert.equal((await multipart('', 'POST', { ...fields, photo_report: 'https://example.com/photo.png' }, [file])).status, 400);
  assert.equal((await multipart('', 'POST', { ...fields, status: 'done' }, [file])).status, 400);
  assert.equal((await multipart('', 'POST', fields, [])).status, 400);
  const created = await multipart('', 'POST', fields, [file]);
  assert.equal(created.status, 201);
  assert.equal(created.body.report.status, 'new');
  assert.equal(created.body.report.facility_id, 1);
  const { id, photo_report: first } = created.body.report;
  try {
    assert.match(first, /^\/uploads\/reports\/[0-9a-f-]+\.png$/);
    assert.deepEqual(await fs.readFile(diskPath(first)), png);
    const served = await fetch(`http://127.0.0.1:${server.address().port}${first}`);
    assert.equal(served.status, 200);
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
    assert.equal((await multipart(`/${id}`, 'PATCH', {}, [file], user)).status, 403);
    assert.equal((await multipart('/999', 'PATCH', {}, [file], employee)).status, 404);
    const originalUpdate = prisma.report.update;
    prisma.report.update = async () => { throw { code: 'P2003' }; };
    const directory = path.join(uploadRoot, 'reports');
    const before = (await fs.readdir(directory)).sort();
    try { assert.equal((await multipart(`/${id}`, 'PATCH', {}, [file], employee)).status, 409); }
    finally { prisma.report.update = originalUpdate; }
    assert.deepEqual((await fs.readdir(directory)).sort(), before);
    await fs.access(diskPath(first));
    const replaced = await multipart(`/${id}`, 'PUT', { status: 'processed' }, [file], employee);
    assert.equal(replaced.status, 200);
    const second = replaced.body.report.photo_report;
    await assert.rejects(fs.access(diskPath(first)), { code: 'ENOENT' });
    assert.deepEqual(await fs.readFile(diskPath(second)), png);
    assert.equal((await multipart(`/${id}`, 'PATCH', { status: 'done' }, [], employee)).body.report.photo_report, second);
    assert.equal((await request(`reports/${id}`, 'DELETE', undefined, employee)).status, 403);
    await fs.access(diskPath(second));
    assert.equal((await request(`reports/${id}`, 'DELETE', undefined, admin)).status, 204);
    await assert.rejects(fs.access(diskPath(second)), { code: 'ENOENT' });
    const originalCreate = prisma.report.create;
    prisma.report.create = async () => { throw { code: 'P2003' }; };
    const snapshot = (await fs.readdir(directory)).sort();
    try { assert.equal((await multipart('', 'POST', fields, [file])).status, 409); }
    finally { prisma.report.create = originalCreate; }
    assert.deepEqual((await fs.readdir(directory)).sort(), snapshot);
  } finally {
    if (reports.has(id)) await request(`reports/${id}`, 'DELETE', undefined, admin);
    await request(`report-categories/${fields.category_id}`, 'DELETE', undefined, admin);
  }
});
