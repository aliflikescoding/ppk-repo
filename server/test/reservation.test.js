const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { validateWindow, timestamp } = require('../src/utils/reservation');
const { seedReservations } = require('../src/scripts/seedReservations');
process.env.JWT_SECRET = 'reservation-test-secret';
const users = new Map(), reservations = new Map();
let sequence = 1, queue = Promise.resolve();
const locks = [], queries = [];
const inactiveFacilities = new Set();
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'facility') return true;
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      return Object.entries(value).every(([operator, operand]) => operator === 'not' ? row[key] !== operand : operator === 'lt' ? row[key] < operand : operator === 'gt' ? row[key] > operand : false);
    }
    return row[key] === value;
  });
}
function result(row, args) {
  if (!row) return null;
  if (args.select) return Object.fromEntries(Object.keys(args.select).map(key => [key, row[key]]));
  return { ...row, ...(args.include ? { user: { id: row.user_id }, facility: { id: row.facility_id } } : {}) };
}
const prisma = {
  async $executeRawUnsafe(sql) { locks.push(sql); },
  user: {
    async findUnique({ where }) { return users.get(where.id) || null; },
    async findMany() { return [...users.values()]; },
  },
  facility: {
    async findUnique({ where }) { return [1, 2].includes(where.id) ? { id: where.id, is_active: !inactiveFacilities.has(where.id) } : null; },
    async findMany() { return [{ id: 1 }, { id: 2 }]; },
  },
  reservation: {
    async findUnique(args) { return result(reservations.get(args.where.id), args); },
    async findFirst(args) { return result([...reservations.values()].find(row => matches(row, args.where)), args); },
    async findMany(args) {
      queries.push(args);
      return [...reservations.values()].filter(row => matches(row, args.where || {})).slice(args.skip || 0, (args.skip || 0) + (args.take || 100)).map(row => result(row, args));
    },
    async count({ where } = {}) { return [...reservations.values()].filter(row => matches(row, where || {})).length; },
    async create(args) { const row = { id: sequence++, created_at: new Date(), reason: null, ...args.data }; reservations.set(row.id, row); return result(row, args); },
    async update(args) { if (!reservations.has(args.where.id)) throw { code: 'P2025' }; const row = { ...reservations.get(args.where.id), ...args.data }; reservations.set(row.id, row); return result(row, args); },
    async delete({ where }) { if (!reservations.has(where.id)) throw { code: 'P2025' }; reservations.delete(where.id); },
  },
  async $transaction(work) {
    if (typeof work !== 'function') return Promise.all(work);
    const run = queue.then(async () => {
      const snapshot = new Map(reservations);
      try { return await work(prisma); }
      catch (error) { reservations.clear(); for (const [id, row] of snapshot) reservations.set(id, row); throw error; }
    });
    queue = run.catch(() => {});
    return run;
  },
};
require.cache[require.resolve('../src/config/prisma')] = { exports: prisma };
const app = express(); app.use(express.json()); app.use('/api/reservations', require('../src/routes/reservation.routes'));
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
function account(role, active = true) {
  const id = randomUUID(); users.set(id, { id, role, isActive: active });
  return { id, token: jwt.sign({}, process.env.JWT_SECRET, { subject: id }) };
}
async function request(path = '', method = 'GET', body, auth) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/reservations${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
const slot = (start, end, facility_id = 1) => ({ facility_id, start_time: `2026-11-01T${start}:00+07:00`, end_time: `2026-11-01T${end}:00+07:00` });
test('reservation permissions, user scopes, conflict handling, calendar privacy and CRUD', async () => {
  const user = account('user'), other = account('user'), admin = account('admin'), employee = account('employee');
  assert.equal((await request()).status, 401);
  assert.equal((await request('', 'POST', slot('09:00', '10:00'))).status, 401);
  assert.equal((await request('', 'POST', slot('09:00', '10:00'), account('user', false))).status, 403);
  assert.equal((await request('', 'POST', slot('09:00', '10:00'), employee)).status, 403);
  for (const data of [{ ...slot('09:00', '10:00'), user_id: other.id }, { ...slot('09:00', '10:00'), status: 'done' }, slot('06:59', '08:00'), slot('19:00', '20:01'), slot('10:00', '09:00'), slot('09:00', '10:00', 99), { ...slot('09:00', '10:00'), end_time: '2026-11-02T10:00:00+07:00' }]) assert.equal((await request('', 'POST', data, user)).status, 400);
  const created = await request('', 'POST', slot('09:00', '10:00'), user);
  assert.equal(created.status, 201); assert.equal(created.body.reservation.status, 'new');
  const id = created.body.reservation.id;
  assert.equal((await request(`/${id}`, 'GET', undefined, other)).status, 404);
  assert.equal((await request(`/${id}`, 'GET', undefined, employee)).status, 200);
  for (const method of ['PATCH', 'PUT', 'DELETE']) assert.equal((await request(`/${id}`, method, { status: 'done' }, user)).status, 403);
  assert.equal((await request(`/${id}`, 'DELETE', undefined, employee)).status, 403);
  assert.equal((await request(`/${id}`, 'PATCH', { status: 'done' }, employee)).status, 200);
  assert.ok(locks.some(sql => sql.includes('SHARE ROW EXCLUSIVE')));
  for (const data of [slot('09:30', '10:30'), slot('08:00', '11:00'), slot('09:15', '09:45'), slot('09:00', '10:00')]) assert.equal((await request('', 'POST', data, other)).status, 409);
  const adjacent = await request('', 'POST', slot('10:00', '11:00'), other); assert.equal(adjacent.status, 201);
  const separate = await request('', 'POST', slot('09:00', '10:00', 2), other); assert.equal(separate.status, 201);
  // Pending requests may overlap, but only one may become done.
  const pendingA = await request('', 'POST', slot('12:00', '13:00'), user);
  const pendingB = await request('', 'POST', slot('12:30', '13:30'), other);
  assert.equal((await request(`/${pendingA.body.reservation.id}`, 'PUT', { status: 'done', reason: 'Approved' }, admin)).status, 200);
  assert.equal((await request(`/${pendingB.body.reservation.id}`, 'PATCH', { status: 'done' }, employee)).status, 409);
  assert.equal((await request(`/${id}`, 'PATCH', { start_time: '2026-11-01T12:00:00+07:00', end_time: '2026-11-01T13:00:00+07:00' }, employee)).status, 409);
  assert.equal((await request(`/${id}`, 'PATCH', { reason: 'Updated' }, employee)).status, 200); // Excludes itself.
  assert.equal((await request('/me', 'GET', undefined, user)).body.total, 2);
  assert.equal((await request(`/user/${user.id}`, 'GET', undefined, employee)).body.total, 2);
  assert.equal((await request(`/user/${other.id}`, 'GET', undefined, user)).status, 403);
  assert.equal((await request('', 'GET', undefined, user)).body.total, 2);
  assert.equal((await request('', 'GET', undefined, employee)).body.total, 5);
  const query = '?facility_id=1&from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z';
  const calendar = await request(`/calendar${query}`);
  assert.equal(calendar.status, 200); assert.equal(calendar.body.total, 2);
  assert.ok(calendar.body.reservations.every(row => row.status === 'done' && row.user_id === undefined && row.reason === undefined && row.user === undefined));
  await request(`/calendar?facility_id=1&from=2026-11-01T09:15:00%2B07:00&to=2026-11-01T09:30:00%2B07:00`);
  assert.equal(queries.at(-1).where.start_time.lt.getTime(), timestamp('2026-11-01T09:30:00+07:00').getTime());
  assert.equal((await request('/calendar')).status, 400);
  for (const path of ['/bad', '/user/bad', '?limit=101', '?status=false', '?search=a&search=b', '?from=bad']) assert.equal((await request(path, 'GET', undefined, admin)).status, 400);
  assert.equal((await request('/999', 'PATCH', { status: 'done' }, employee)).status, 404);
  const onBehalf = await request('', 'POST', { ...slot('16:00', '17:00'), user_id: other.id, status: 'done' }, admin);
  assert.equal(onBehalf.status, 201); assert.equal(onBehalf.body.reservation.user_id, other.id);
  assert.equal((await request(`/${id}`, 'DELETE', undefined, admin)).status, 204);
  assert.equal((await request('', 'POST', slot('09:00', '10:00'), user)).status, 201);
  // The mock serializes transactions like the database table lock.
  const concurrent = await Promise.all([1,2].map(() => request('', 'POST', { ...slot('18:00', '19:00'), status: 'done' }, admin)));
  assert.deepEqual(concurrent.map(res => res.status).sort(), [201, 409]);
});
test('time validation accepts business-hour boundaries and rejects invalid dates', () => {
  validateWindow(timestamp('2026-11-01T07:00:00+07:00'), timestamp('2026-11-01T20:00:00+07:00'));
  validateWindow(timestamp('2026-11-01T00:00:00Z'), timestamp('2026-11-01T13:00:00Z'));
  for (const invalid of ['2026-02-30T09:00:00+07:00', '2026-11-01T24:00:00+07:00', '2026-11-01T09:00:00', 'invalid']) assert.throws(() => timestamp(invalid));
});
test('users can only submit reservations for active facilities; admins retain access', async () => {
  const user = account('user'), admin = account('admin');
  inactiveFacilities.add(2);
  const body = { facility_id: 2, start_time: '2026-11-02T09:00:00+07:00', end_time: '2026-11-02T10:00:00+07:00' };
  try {
    const count = reservations.size;
    const denied = await request('', 'POST', body, user);
    assert.equal(denied.status, 403);
    assert.match(denied.body.message, /inactive/);
    assert.equal(reservations.size, count);
    assert.equal((await request('', 'POST', body, admin)).status, 201);
    inactiveFacilities.delete(2);
    assert.equal((await request('', 'POST', body, user)).status, 201);
  } finally { inactiveFacilities.delete(2); }
});
test('reservation seed skips populated tables, seeds empty tables, and rolls back failures', async () => {
  await seedReservations(prisma);
  const snapshot = [...reservations.values()];
  await seedReservations(prisma); assert.deepEqual([...reservations.values()], snapshot);
  reservations.clear();
  await seedReservations(prisma); assert.equal(reservations.size, 4);
  assert.deepEqual([...reservations.values()].map(row => row.status), ['new', 'processed', 'done', 'rejected']);
  for (const row of reservations.values()) validateWindow(row.start_time, row.end_time);
  reservations.clear();
  const create = prisma.reservation.create;
  prisma.reservation.create = async args => { if (reservations.size) throw new Error('Insert failure'); return create(args); };
  try { await assert.rejects(seedReservations(prisma), /Insert failure/); assert.equal(reservations.size, 0); }
  finally { prisma.reservation.create = create; }
  const savedUsers = new Map(users); users.clear();
  try { await assert.rejects(seedReservations(prisma), /requires existing users and facilities/); }
  finally { for (const [id, row] of savedUsers) users.set(id, row); }
});

test('users update only their own facility and times, with validation and availability checks', async () => {
  const user = account('user'), other = account('user'), admin = account('admin');
  const body = { facility_id: 1, start_time: '2026-11-05T09:00:00+07:00', end_time: '2026-11-05T10:00:00+07:00' };
  const created = await request('', 'POST', body, user);
  const id = created.body.reservation.id;
  assert.equal((await request(`/${id}`, 'PATCH', { end_time: '2026-11-05T10:30:00+07:00' }, user)).status, 200);
  const moved = await request(`/${id}`, 'PUT', { facility_id: 2 }, user);
  assert.equal(moved.status, 200);
  assert.equal(moved.body.reservation.facility_id, 2);
  assert.equal(moved.body.reservation.status, 'new');
  assert.equal(moved.body.reservation.user_id, user.id);
  for (const method of ['PATCH', 'PUT']) assert.equal((await request(`/${id}`, method, { facility_id: 1 }, other)).status, 404);
  for (const body of [{ status: 'done' }, { reason: 'Approve myself' }]) assert.equal((await request(`/${id}`, 'PATCH', body, user)).status, 403);
  assert.equal((await request(`/${id}`, 'PATCH', { user_id: other.id }, user)).status, 400);
  assert.equal((await request(`/${id}`, 'PATCH', { end_time: '2026-11-05T08:00:00+07:00' }, user)).status, 400);
  assert.equal((await request(`/${id}`, 'PATCH', {}, user)).status, 400);
  inactiveFacilities.add(1);
  try { assert.equal((await request(`/${id}`, 'PATCH', { facility_id: 1 }, user)).status, 403); }
  finally { inactiveFacilities.delete(1); }
  const booked = await request('', 'POST', { ...body, facility_id: 2, start_time: '2026-11-05T11:00:00+07:00', end_time: '2026-11-05T12:00:00+07:00', status: 'done' }, admin);
  assert.equal(booked.status, 201);
  assert.equal((await request(`/${id}`, 'PATCH', { start_time: '2026-11-05T11:30:00+07:00', end_time: '2026-11-05T12:30:00+07:00' }, user)).status, 409);
  assert.equal(reservations.get(id).start_time.getTime(), timestamp(body.start_time).getTime());
  assert.equal((await request(`/${id}`, 'PATCH', { status: 'done' }, admin)).status, 200);
  const unchanged = await request(`/${id}`, 'PATCH', { end_time: '2026-11-05T10:00:00+07:00' }, user);
  assert.equal(unchanged.status, 200);
  assert.equal(unchanged.body.reservation.status, 'done');
  assert.equal((await request(`/${id}`, 'DELETE', undefined, user)).status, 403);
});

test('user cancellation checks ownership, status, exact cutoff and restricted payloads', async () => {
  const user = account('user'), other = account('user');
  const frozen = Date.parse('2026-11-10T00:00:00Z');
  const originalNow = Date.now;
  Date.now = () => frozen;
  async function row(hours, status = 'new') {
    return prisma.reservation.create({ data: { user_id: user.id, facility_id: 2, status, start_time: new Date(frozen + hours * 3600000), end_time: new Date(frozen + (hours + 1) * 3600000) } });
  }
  try {
    const eligible = await row(5);
    assert.equal((await request(`/${eligible.id}`, 'PATCH', { status: 'rejected' }, other)).status, 404);
    assert.equal((await request(`/${eligible.id}`, 'PATCH', { status: 'rejected', start_time: '2026-11-10T09:00:00+07:00' }, user)).status, 403);
    assert.equal((await request(`/${eligible.id}`, 'PATCH', { status: 'rejected', reason: 'Mine' }, user)).status, 403);
    inactiveFacilities.add(2);
    const cancelled = await request(`/${eligible.id}`, 'PATCH', { status: 'rejected' }, user);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.reservation.status, 'rejected');
    assert.equal(cancelled.body.reservation.reason, 'Cancelled by user.');
    assert.equal((await request(`/${eligible.id}`, 'PATCH', { status: 'rejected' }, user)).status, 409);
    const late = await row(5 - 1 / 3600000);
    assert.equal((await request(`/${late.id}`, 'PATCH', { status: 'rejected' }, user)).status, 409);
    assert.equal(reservations.get(late.id).status, 'new');
    for (const status of ['processed', 'done', 'rejected']) {
      const finalized = await row(6, status);
      assert.equal((await request(`/${finalized.id}`, 'PATCH', { status: 'rejected' }, user)).status, 409);
    }
  } finally { Date.now = originalNow; inactiveFacilities.delete(2); }
});
