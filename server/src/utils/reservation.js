const { parseId } = require("./facility");
const { publicUser } = require("./user");
const statuses = ["new", "processed", "done", "rejected"];
const reservationInclude = { user: { select: publicUser }, facility: true };
function problem(status, message) { return Object.assign(new Error(message), { httpStatus: status }); }
function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw problem(400, "Times must be ISO timestamps with seconds and an explicit timezone (Z or +07:00).");
  const date = new Date(value);
  const day = value.slice(0, 10);
  if (!Number.isFinite(date.getTime()) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) throw problem(400, "Invalid timestamp.");
  return date;
}
function validateWindow(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw problem(400, "end_time must be later than start_time.");
  // Database timestamps are stored as UTC; business hours are Asia/Jakarta (UTC+7).
  const local = date => new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString();
  const a = local(start), b = local(end);
  if (a.slice(0, 10) !== b.slice(0, 10) || a.slice(11, 23) < "07:00:00.000" || b.slice(11, 23) > "20:00:00.000") throw problem(400, "Reservations must start and end on the same day between 07:00 and 20:00 Asia/Jakarta.");
}
function reservationData(body, partial, admin) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw problem(400, "A JSON object is required.");
  const allowed = ["facility_id", "start_time", "end_time", ...(partial || admin ? ["status", "reason"] : []), ...(admin && !partial ? ["user_id"] : [])];
  if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) throw problem(400, "Unknown or disallowed reservation field, or empty body.");
  const data = { ...body };
  if ((!partial || body.facility_id !== undefined) && (!Number.isInteger(body.facility_id) || !parseId(String(body.facility_id)))) throw problem(400, "facility_id must be a positive integer.");
  for (const key of ["start_time", "end_time"]) if (!partial || body[key] !== undefined) data[key] = timestamp(body[key]);
  if (body.status !== undefined && !statuses.includes(body.status)) throw problem(400, "Invalid reservation status.");
  if (body.reason !== undefined && body.reason !== null && (typeof body.reason !== "string" || body.reason.length > 500)) throw problem(400, "reason must be null or a string of at most 500 characters.");
  if (!partial) validateWindow(data.start_time, data.end_time);
  return data;
}
function listOptions(query, calendar = false) {
  const allowed = calendar ? ["facility_id", "from", "to", "page", "limit"] : ["facility_id", "status", "from", "to", "page", "limit", "search", "sort_by", "sort_order"];
  if (Object.keys(query).some(key => !allowed.includes(key)) || Object.values(query).some(value => typeof value !== "string")) throw problem(400, "Invalid reservation query parameters.");
  const page = query.page === undefined ? 1 : parseId(query.page), limit = query.limit === undefined ? 20 : parseId(query.limit);
  if (!page || !limit || limit > 100 || (page - 1) * limit > 2147483647) throw problem(400, "Invalid page or limit (1–100), or offset too large.");
  const where = {};
  if (query.facility_id !== undefined) {
    where.facility_id = parseId(query.facility_id);
    if (!where.facility_id) throw problem(400, "facility_id must be a positive integer.");
  }
  if (query.status !== undefined) {
    if (!statuses.includes(query.status)) throw problem(400, "Invalid reservation status.");
    where.status = query.status;
  }
  const from = query.from === undefined ? null : timestamp(query.from), to = query.to === undefined ? null : timestamp(query.to);
  if (calendar && (!where.facility_id || !from || !to)) throw problem(400, "Calendar requires facility_id, from and to.");
  if (from && to && to <= from) throw problem(400, "to must be later than from.");
  // Return intervals intersecting [from, to), including reservations spanning a boundary.
  if (from) where.end_time = { gt: from };
  if (to) where.start_time = { lt: to };
  if (query.search !== undefined) {
    if (query.search.length > 100) throw problem(400, "search must be at most 100 characters.");
    if (query.search.trim()) where.facility = { name: { contains: query.search.trim(), mode: "insensitive" } };
  }
  const sort = query.sort_by ?? "start_time", direction = query.sort_order ?? "asc";
  if (!["id", "start_time", "end_time", "created_at", "status"].includes(sort) || !["asc", "desc"].includes(direction)) throw problem(400, "Invalid sorting.");
  if (calendar) where.status = "done";
  return { page, limit, where, orderBy: [{ [sort]: direction }, ...(sort === "id" ? [] : [{ id: "asc" }])] };
}
async function assertAvailable(tx, data, excludeId) {
  const conflict = await tx.reservation.findFirst({ where: {
    facility_id: data.facility_id, status: "done", start_time: { lt: data.end_time }, end_time: { gt: data.start_time },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  }, select: { id: true } });
  if (conflict) throw problem(409, "This facility is already reserved during that time.");
}
function handleError(error, res) {
  if (error.httpStatus) return res.status(error.httpStatus).json({ message: error.message });
  if (error.code === "P2025") return res.status(404).json({ message: "Reservation not found." });
  if (error.code === "P2003") return res.status(409).json({ message: "Referenced user or facility no longer exists." });
  console.error("Reservation operation failed:", error);
  return res.status(500).json({ message: "An unexpected error occurred." });
}
module.exports = { reservationInclude, problem, timestamp, validateWindow, reservationData, listOptions, assertAvailable, handleError };
