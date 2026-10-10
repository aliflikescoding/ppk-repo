const MAX_INT = 2147483647;
const facilityInclude = { type: true, location: true, images: { orderBy: { id: "asc" } } };
const positiveInt = (value) => Number.isInteger(value) && value > 0 && value <= MAX_INT;

function parseId(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value) && positiveInt(Number(value)) ? Number(value) : null;
}

function validateFacility(data, partial = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "A JSON object is required.";
  const allowed = ["name", "capacity", "type_id", "location_id", "is_active", "image_urls"];
  if (Object.keys(data).some((key) => !allowed.includes(key))) return "Unknown facility field.";
  if (partial && !Object.keys(data).length) return "Provide at least one field to update.";
  if (!partial || data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 50) return "name must contain 1–50 characters.";
  }
  for (const field of ["capacity", "type_id", "location_id"]) {
    if ((!partial || data[field] !== undefined) && !positiveInt(data[field])) return `${field} must be a positive integer.`;
  }
  if (data.is_active !== undefined && typeof data.is_active !== "boolean") return "is_active must be a boolean.";
  if (data.image_urls !== undefined) {
    if (!Array.isArray(data.image_urls) || data.image_urls.length > 20) return "image_urls must be an array of at most 20 URLs.";
    for (const url of data.image_urls) {
      try {
        if (typeof url !== "string" || url.length > 500 || !["http:", "https:"].includes(new URL(url).protocol)) return "Images must have valid HTTP or HTTPS URLs of at most 500 characters.";
      } catch { return "Images must have valid HTTP or HTTPS URLs of at most 500 characters."; }
    }
  }
  return null;
}

function parseListQuery(query) {
  const allowed = ["page", "limit", "search", "type_id", "location_id", "is_active", "min_capacity", "max_capacity", "sort_by", "sort_order"];
  if (Object.keys(query).some((key) => !allowed.includes(key)) || Object.values(query).some((value) => typeof value !== "string")) throw new Error("Invalid facility query parameters.");
  const page = query.page === undefined ? 1 : parseId(query.page);
  const limit = query.limit === undefined ? 20 : parseId(query.limit);
  if (!page || !limit || limit > 100 || (page - 1) * limit > MAX_INT) throw new Error("page must be positive and limit must be between 1 and 100; offset is too large.");
  const where = {};
  for (const field of ["type_id", "location_id", "min_capacity", "max_capacity"]) {
    if (query[field] !== undefined) {
      const value = parseId(query[field]);
      if (!value) throw new Error(`${field} must be a positive integer.`);
      if (field.endsWith("capacity")) where.capacity = { ...where.capacity, [field === "min_capacity" ? "gte" : "lte"]: value };
      else where[field] = value;
    }
  }
  if (where.capacity?.gte > where.capacity?.lte) throw new Error("min_capacity cannot exceed max_capacity.");
  if (query.is_active !== undefined) {
    if (!["true", "false"].includes(query.is_active)) throw new Error("is_active must be true or false.");
    where.is_active = query.is_active === "true";
  }
  if (query.search !== undefined) {
    if (query.search.length > 100) throw new Error("search must be at most 100 characters.");
    const contains = query.search.trim();
    if (contains) where.OR = [
      { name: { contains, mode: "insensitive" } },
      { type: { name: { contains, mode: "insensitive" } } },
      { location: { name: { contains, mode: "insensitive" } } },
    ];
  }
  const sortBy = query.sort_by ?? "id";
  const sortOrder = query.sort_order ?? "asc";
  if (!["id", "name", "capacity", "is_active"].includes(sortBy) || !["asc", "desc"].includes(sortOrder)) throw new Error("Invalid sort_by or sort_order.");
  return { page, limit, where, orderBy: [{ [sortBy]: sortOrder }, ...(sortBy === "id" ? [] : [{ id: "asc" }])] };
}

function handleFacilityError(error, res) {
  if (error.code === "P2025") return res.status(404).json({ message: "Facility not found." });
  if (error.code === "P2003") return res.status(409).json({ message: "Invalid type/location or facility has related reports or reservations." });
  console.error("Facility operation failed:", error);
  return res.status(500).json({ message: "An unexpected error occurred." });
}

module.exports = { facilityInclude, parseId, validateFacility, parseListQuery, handleFacilityError };
