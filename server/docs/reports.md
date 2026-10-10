# Reports API

All routes require `Authorization: Bearer <token>` from an active account.

| Operation | User | Employee | Admin |
| --- | --- | --- | --- |
| Create report | Yes | Yes | Yes |
| Read reports | Own reports | All reports | All reports |
| Update report | No | Yes | Yes |
| Delete report | No | No | Yes |
| Report-category CRUD, including reads | No | No | Yes |

## Report routes

Base URL: `/api/reports`.

- `POST /`: create a report for the authenticated account. Status always starts as `new`; supplying `status`, `user_id`, or `reason` is rejected.
- `GET /`: paginated reports. Regular users only receive their own; employees/admins receive all.
- `GET /me`: separate route for the authenticated account's reports, for every role.
- `GET /user/:userId`: reports for a specified user UUID. Regular users can only request their own UUID; employees/admins can request any UUID. No matching reports returns an empty list.
- `GET /:id`: report detail. Regular users cannot retrieve other people's reports (404).
- `PATCH /:id` or `PUT /:id`: staff-only partial update.
- `DELETE /:id`: admin-only deletion (204).

Create example:

```json
{
  "facility_id": 1,
  "category_id": 1,
  "description": "The meeting room chair is broken.",
  "photo_report": "https://example.com/broken-chair.jpg"
}
```

Facility and category must exist. Description requires 1–500 characters. `photo_report` is required: send either an HTTP/HTTPS image URL up to 2000 characters in JSON, or one image file through multipart FormData as shown below.

Update example:

```json
{ "status": "processed", "reason": "Maintenance has been scheduled." }
```

Updatable fields: `facility_id`, `category_id`, `description`, `photo_report`, `status`, `reason`. Status accepts `new`, `processed`, `done`, `rejected`. Reason is nullable and allows up to 500 characters. The existing database column `reaseon` is exposed as `reason` in API requests/responses. Report ownership cannot be changed.

Create/detail/update responses contain `report`. Report details include the facility, category, and user profile without a password.

Lists support `page` (default 1), `limit` (default 20, max 100), `search` (case-insensitive description/facility/category search, max 100 characters), `status`, `facility_id`, `category_id`, `sort_by` (`id` or `status`, default `id`), and `sort_order` (`asc` or `desc`, default `desc`). These also apply to `/me` and `/user/:userId`.

List responses contain `reports`, `page`, `limit`, `total`, `total_pages`, `has_next`, and `has_previous`. Totals use the same ownership scope and filters as the returned reports.

## Report categories

Base URL: `/api/report-categories`. All operations, including reading, are admin-only.

Supports `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `PUT /:id`, `DELETE /:id`. Create/update accept only `{ "name": "Maintenance" }` (1–50 characters). Responses use `category` or `categories`. Lists support `page`, `limit`, `search`, `sort_by` (`id`, `name`), and `sort_order` (`asc`, `desc`), matching facility-type defaults.

A category can be used by many reports. Deleting a category referenced by reports returns 409. Admins must remove or recategorize those reports first.

## Database setup

The new migration removes the unique constraint on report category IDs and adds indexes for category and user queries. It preserves existing reports.

Run `npm run prisma:migrate` to apply migrations to your database. Run `npm run prisma:generate` after schema changes (already regenerated during implementation).

Verification: `node --test --test-concurrency=1 test/*.test.js`. API tests use a mocked database.

## Upload report photos from the frontend

POST, PATCH, and PUT accept `multipart/form-data`. Use `photo_report` as the file field. Upload one PNG, JPEG, or WebP photo, at most 5 MB. The file signature must match the MIME type. Invalid uploads return 400; oversized photos return 413. Authentication and update permissions run before upload parsing.

```js
const form = new FormData();
form.append("facility_id", String(facilityId));
form.append("category_id", String(categoryId));
form.append("description", description);
form.append("photo_report", photoInput.files[0]);

const response = await fetch(`${API_ORIGIN}/api/reports`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const result = await response.json();
if (!response.ok) throw new Error(result.message);
// result.report.photo_report: /uploads/reports/<uuid>.png
const imageSrc = new URL(result.report.photo_report, API_ORIGIN).href;
```

Let the browser set Content-Type so the multipart boundary is included. Do not send both a file and a URL in the same `photo_report` field. A file is required on creation unless a URL is supplied; omitting it on update keeps the existing photo.

Admins and employees can replace a photo by sending a FormData file to `PATCH /api/reports/:id` or `PUT /api/reports/:id`. An image-only update is supported. Regular users can upload on creation but cannot update reports. New reports still start as `new`.

Photos are stored in `public/uploads/reports` with generated filenames and served publicly through `/uploads/reports/...`. Uploaded photos are removed after successful replacement or report deletion. Failed saves remove newly uploaded files while keeping existing photos. External image URLs are never deleted from their hosts. JSON URL requests remain supported; local upload URLs are returned by the server and cannot be submitted as JSON references to another report's file.

Uploads need persistent storage in production. No additional database migration is required for photo uploads.

## Seed reports

Run `npm run script:seed` or `npm run prisma:seed`. The combined command seeds users, facilities, then reports. Each table is independently checked: an empty table is seeded; a populated table is skipped without changing existing rows.

An empty reports table receives two reports with status `new`: a broken meeting-room chair and a cracked computer-lab monitor. Generated damage photos are tracked in `prisma/seed-assets/damaged-chair.png` and `prisma/seed-assets/damaged-monitor.png`. The seeder copies them to `public/uploads/reports` with unique filenames, so the report API can display their URLs immediately.

The report seed reuses matching report categories or creates missing ones, and references existing users and facilities. It prefers the facility examples by name and falls back to available facilities if they have been customized. It does not alter user activation or create extra facilities. Missing users/facilities produce a clear error. Report inserts and category creation run in a transaction with an empty-table check protected by a table lock; failures clean up copied photos.
