const { parseId } = require("./facility");
const { publicUser } = require("./user");
const statuses = ["new", "processed", "done", "rejected"];
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isStaff = user => ["admin", "employee"].includes(user.role);
const reportInclude = { user: { select: publicUser }, facility: true, category: true };
function validateReport(body, partial = false, hasPhoto = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "A JSON object is required.";
  const allowed = ["facility_id", "category_id", "description", "photo_report", ...(partial ? ["status", "reason"] : [])];
  if (Object.keys(body).some(key => !allowed.includes(key))) return "Unknown or disallowed report field.";
  if (partial && !Object.keys(body).length && !hasPhoto) return "Provide at least one field to update.";
  for (const key of ["facility_id", "category_id"]) {
    if ((!partial || body[key] !== undefined) && (!Number.isInteger(body[key]) || !parseId(String(body[key])))) return `${key} must be a positive integer.`;
  }
  if (!partial || body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 500) return "description must contain 1–500 characters.";
  }
  if (!hasPhoto && (!partial || body.photo_report !== undefined)) {
    try {
      if (typeof body.photo_report !== "string" || body.photo_report.length > 2000 || !["http:", "https:"].includes(new URL(body.photo_report).protocol)) return "photo_report must be an HTTP or HTTPS URL of at most 2000 characters.";
    } catch { return "photo_report must be an HTTP or HTTPS URL of at most 2000 characters."; }
  }
  if (body.status !== undefined && !statuses.includes(body.status)) return "status must be new, processed, done, or rejected.";
  if (body.reason !== undefined && body.reason !== null && (typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500)) return "reason must be null or contain 1–500 characters.";
  return null;
}
function parseReportQuery(query) {
  const allowed = ["page", "limit", "search", "status", "facility_id", "category_id", "sort_by", "sort_order"];
  if (Object.keys(query).some(key => !allowed.includes(key)) || Object.values(query).some(value => typeof value !== "string")) throw new Error("Invalid report query parameters.");
  const page = query.page === undefined ? 1 : parseId(query.page);
  const limit = query.limit === undefined ? 20 : parseId(query.limit);
  if (!page || !limit || limit > 100 || (page - 1) * limit > 2147483647) throw new Error("Invalid page or limit (1–100), or offset too large.");
  const where = {};
  for (const key of ["facility_id", "category_id"]) {
    if (query[key] !== undefined) {
      const id = parseId(query[key]);
      if (!id) throw new Error(`${key} must be a positive integer.`);
      where[key] = id;
    }
  }
  if (query.status !== undefined) {
    if (!statuses.includes(query.status)) throw new Error("Invalid report status.");
    where.status = query.status;
  }
  if (query.search !== undefined) {
    if (query.search.length > 100) throw new Error("search must be at most 100 characters.");
    const contains = query.search.trim();
    if (contains) where.OR = [
      { description: { contains, mode: "insensitive" } },
      { facility: { name: { contains, mode: "insensitive" } } },
      { category: { name: { contains, mode: "insensitive" } } },
    ];
  }
  const sort = query.sort_by ?? "id", direction = query.sort_order ?? "desc";
  if (!["id", "status"].includes(sort) || !["asc", "desc"].includes(direction)) throw new Error("Invalid sort_by or sort_order.");
  return { page, limit, where, orderBy: [{ [sort]: direction }, ...(sort === "id" ? [] : [{ id: "desc" }])] };
}
function handleReportError(error, res) {
  if (error.code === "P2025") return res.status(404).json({ message: "Report not found." });
  if (error.code === "P2003") return res.status(409).json({ message: "Report references a user, facility, or category that no longer exists." });
  console.error("Report operation failed:", error);
  return res.status(500).json({ message: "An unexpected error occurred." });
}
// Preserve the existing database column spelling while exposing reason in the API.
function serializeReport(report) {
  const { reaseon, ...rest } = report;
  return { ...rest, reason: reaseon ?? null };
}
module.exports = { uuid, isStaff, reportInclude, validateReport, parseReportQuery, handleReportError, serializeReport };
