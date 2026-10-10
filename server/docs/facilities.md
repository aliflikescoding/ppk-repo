# Facilities API

Base URL: `/api/facilities`.

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/` | Public | Paginated facilities |
| GET | `/:id` | Public | One facility, or 404 |
| POST | `/` | Active admin | Create facility (201) |
| PATCH / PUT | `/:id` | Active admin | Update supplied fields (200) |
| DELETE | `/:id` | Active admin | Delete facility and images (204) |

Writes require `Authorization: Bearer <token>` obtained from login. Missing or invalid tokens return 401; non-admin or inactive accounts return 403. Both PATCH and PUT accept partial updates.

## Create or update

```json
{
  "name": "Meeting room",
  "capacity": 20,
  "type_id": 1,
  "location_id": 1,
  "is_active": true,
  "image_urls": ["https://example.com/room.jpg"]
}
```

Creation requires `name`, `capacity`, `type_id`, and `location_id`. Types and locations must already exist. Capacity and IDs must be positive integers. Names allow up to 50 characters. `is_active` defaults to false. `image_urls` is optional, accepts up to 20 HTTP/HTTPS URLs, and replaces all images when supplied on update; an empty array removes all images. Omitted fields remain unchanged on update.

Create, detail, and update responses contain `{ "facility": {...} }`. Facilities include `type`, `location`, and `images` details. Inactive facilities are also publicly readable.

## List query

Example: `/api/facilities?page=1&limit=10&search=meeting&is_active=true&sort_by=name&sort_order=asc`

| Parameter | Meaning / default |
| --- | --- |
| `page` | Positive page number; default 1 |
| `limit` | 1–100 results per page; default 20 |
| `search` | Case-insensitive substring in facility, type, or location name; max 100 characters |
| `type_id`, `location_id` | Filter by existing relation ID |
| `is_active` | `true` or `false` |
| `min_capacity`, `max_capacity` | Inclusive positive capacity bounds |
| `sort_by` | `id` (default), `name`, `capacity`, or `is_active` |
| `sort_order` | `asc` (default) or `desc` |

Filters combine with AND; search matches any of the three names. Sorting uses ID as a tie breaker. Invalid or unknown query parameters return 400.

List responses contain `facilities`, `page`, `limit`, `total`, `total_pages`, `has_next`, and `has_previous`. Totals reflect the applied filters. Pages beyond the last page return an empty array.

Invalid bodies or IDs return 400; missing facilities return 404. Deletion returns 409 if reports or reservations reference the facility. Image deletion and facility deletion run together in a transaction, preserving images when deletion fails.

## Validation

Run `node --test test/*.test.js`. API tests use a mocked database; they do not require or modify the configured database.

## Upload images from the frontend

POST, PATCH, and PUT also accept `multipart/form-data`. Append each file using the repeated `images` field. Accepted formats: PNG, JPEG, WebP; maximum 20 files, 5 MB per file. File signatures must match their MIME types. Authentication runs before upload parsing.

```js
const form = new FormData();
form.append("name", "Meeting room");
form.append("capacity", "20");
form.append("type_id", "1");
form.append("location_id", "1");
form.append("is_active", "true");
for (const file of imageInput.files) form.append("images", file);

const response = await fetch(`${API_ORIGIN}/api/facilities`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const result = await response.json();
if (!response.ok) throw new Error(result.message);
// Each result.facility.images entry contains id, facility_id, and image_url.
// Uploaded image_url values look like /uploads/facilities/<uuid>.png.
// Display them using: image.src = new URL(image.image_url, API_ORIGIN).href;
```

Let the browser set Content-Type so it includes the multipart boundary.

For an image-only update, send the files in FormData to `PATCH /api/facilities/:id`. Sending files replaces all previous images. Omit both `images` and `image_urls` to keep images unchanged. To remove all images, send JSON `{ "image_urls": [] }`, or append `image_urls` with the string `"[]"` to FormData. Do not combine file uploads with `image_urls` in one request.

Images are saved in `public/uploads/facilities` and served publicly at `/uploads/facilities/...`. Uploaded files are removed after successful replacement or deletion, and newly uploaded files are cleaned up if the database save fails. External image URLs are never deleted from their hosts. Oversized files return 413; invalid uploads return 400.

Production hosting must retain the uploads directory on persistent storage. No database migration is needed.

## Seed facilities

Run `npm run script:seed` (or `npm run prisma:seed`) to seed users and facilities independently. Each table is seeded only when completely empty; a populated table is skipped without filling gaps or updating rows. Run `npm run script:seedFacilities` to seed only facilities.

The facility seed creates an active meeting room (capacity 12) and computer laboratory (capacity 20), with generated photos. It reuses matching type/location records or creates missing ones. A database transaction locks the facilities table while checking and inserting, so overlapping facility seed runs cannot duplicate the examples.

Source images live in `prisma/seed-assets`. Seeding copies them into `public/uploads/facilities` with unique filenames and stores publicly accessible `/uploads/facilities/...` URLs. Source images remain available for reseeding after facilities are deleted. Failed seeds roll back database changes and clean up copied files.
