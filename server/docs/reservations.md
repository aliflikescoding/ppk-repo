# Reservations API

The existing reservations table now uses `status` (`new`, `processed`, `done`, `rejected`) and nullable `reason` (up to 500 characters), replacing `isAccepted`. Migration preserves accepted reservations as `done` and unaccepted reservations as `new`. Reports remain a separate resource.

Base URL: `/api/reservations`.

| Route | Access |
| --- | --- |
| `POST /` | Active user or admin |
| `GET /`, `GET /:id` | Users: own reservations; employees/admins: all |
| `GET /me` | Own reservations, for any active role |
| `GET /user/:userId` | Users: their own UUID; employees/admins: any user UUID |
| `PATCH /:id`, `PUT /:id` | Users: own booking details; employees/admins: any reservation |
| `DELETE /:id` | Active admin only |
| `GET /calendar` | Public, occupied time slots only |

All routes except calendar require `Authorization: Bearer <token>`. Employees cannot create or delete reservations. Regular users can update their own facility and times but cannot delete reservations or change status/reason. Other people's reservation details return 404 for regular users.

## Create

```json
{
  "facility_id": 1,
  "start_time": "2026-11-01T09:00:00+07:00",
  "end_time": "2026-11-01T10:00:00+07:00"
}
```

New user requests always start as `new`, belong to the authenticated user, and cannot set status, reason, or another user's ID. Regular users can only submit reservations for facilities with `is_active: true`; inactive facilities return 403 without creating a reservation. Admins retain access to inactive facilities and may also provide `status`, nullable `reason`, and an existing `user_id` to create on behalf of someone else. Omitted admin status defaults to `new`.

Supply timestamps with seconds and an explicit timezone: `Z` or an offset such as `+07:00`. The database stores UTC; business hours are **07:00–20:00 Asia/Jakarta**. Start/end must be on the same local day and end must be later than start. Facility and user references must exist. There is no future-only restriction.

A `done` reservation occupies its facility's slot. On creation the system checks for overlapping done reservations and returns **409** if occupied. Adjacent bookings are allowed: 09:00–10:00 does not overlap 10:00–11:00. Pending (`new`/`processed`) or rejected requests do not occupy slots, so multiple pending requests can overlap.

## Update and delete

Users can partially update `facility_id`, `start_time`, and `end_time` on their own reservations, subject to active-facility, business-hour, and conflict checks. Status/reason and ownership cannot be changed by users. Existing status is preserved when users edit booking details. Other users' reservations return 404.

Staff can partially update `facility_id`, `start_time`, `end_time`, `status`, and `reason`. Ownership and creation time cannot be changed. Both PUT and PATCH accept partial updates; merged start/end values must still satisfy business hours.

```json
{ "status": "done", "reason": "Approved for the requested time." }
```

Marking a reservation done rechecks availability, excluding itself. Changing its facility or times also checks availability. Checks and writes run together in a transaction with a reservation table lock, so simultaneous approvals cannot double-book through the API. Changing status away from done releases its slot. Deletion returns 204.

Create returns 201; detail/update return 200 with `{ "reservation": {...} }`. Details include facility and user profile without passwords. Validation errors return 400; absent reservations 404; forbidden operations 403.

## Lists and user routes

`GET /`, `/me`, and `/user/:userId` support:

- `page`: default 1; `limit`: default 20, maximum 100.
- `facility_id`, `status`: filters.
- `from`, `to`: ISO timestamps; returns intervals intersecting `[from, to)`.
- `search`: case-insensitive facility-name search, at most 100 characters.
- `sort_by`: `id`, `start_time` (default), `end_time`, `created_at`, `status`.
- `sort_order`: `asc` (default) or `desc`.

Lists return `reservations`, `page`, `limit`, `total`, `total_pages`, `has_next`, and `has_previous`. Ownership filters also apply to totals.

## Calendar

```js
const query = new URLSearchParams({
  facility_id: String(facilityId),
  from: "2026-11-01T00:00:00+07:00",
  to: "2026-12-01T00:00:00+07:00",
  limit: "100",
  page: "1",
});
const response = await fetch(`${API_ORIGIN}/api/reservations/calendar?${query}`);
const data = await response.json();
// Each data.reservations entry: id, facility_id, start_time, end_time, status.
// Fetch subsequent pages while data.has_next is true.
```

`facility_id`, `from`, and `to` are required. Calendar only lists done reservations, including slots intersecting a date-range boundary. It exposes no user IDs, profiles, or reasons. It uses the same pagination metadata; fetch every page before treating absent slots as free. Calendar availability is a snapshot; creation/approval always performs a fresh conflict check.

## Migration and seed

From the server directory:

```bash
npm run prisma:migrate
npm run prisma:generate
npm run script:seed
```

Restart the server afterward. The combined seed runs users, facilities, reports, then reservations. Each table is independently seeded only when empty. The reservation seed creates four non-overlapping one-hour examples tomorrow in Asia/Jakarta, one for each status, using existing users/facilities. It never changes populated reservation tables and rolls back if dependencies or inserts fail.

Tests: `node --test --test-concurrency=1 test/*.test.js`. API tests use a mocked database, including serialized transaction behavior; they do not verify PostgreSQL locking against a live database.

## User cancellation

Users may PATCH their own reservation with exactly `{ "status": "rejected" }` when its status is `new` and the start is at least five hours away (inclusive). The server sets reason to `Cancelled by user.`. Other status/reason changes remain forbidden. Ownership, current status, and the cutoff are checked within the transaction; ineligible cancellation returns 409. Cancellation is allowed even if the facility has since become inactive.
