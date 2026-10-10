const prisma = require("../config/prisma");
const { parseListQuery } = require("../utils/facility");

// Types and locations share the same fields but use separate models and endpoints.
module.exports = ({ model, singular, plural, label }) => {
  const table = prisma[model];
  function handleError(error, res) {
    if (error.code === "P2025") return res.status(404).json({ message: `${label} not found.` });
    if (error.code === "P2003") return res.status(409).json({ message: `${label} is used by facilities and cannot be deleted.` });
    console.error(`${label} operation failed:`, error);
    return res.status(500).json({ message: "An unexpected error occurred." });
  }
  async function save(req, res, partial) {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "name") || typeof body.name !== "string" || !body.name.trim() || body.name.length > 50) {
      return res.status(400).json({ message: "Provide only name, containing 1–50 characters." });
    }
    try {
      const data = { name: body.name.trim() };
      const record = partial ? await table.update({ where: { id: req.referenceId }, data }) : await table.create({ data });
      return res.status(partial ? 200 : 201).json({ [singular]: record });
    } catch (error) { return handleError(error, res); }
  }
  return {
    async list(req, res) {
      let options;
      try {
        const allowed = ["page", "limit", "search", "sort_by", "sort_order"];
        if (Object.keys(req.query).some(key => !allowed.includes(key)) || (req.query.sort_by !== undefined && !["id", "name"].includes(req.query.sort_by))) throw new Error("Invalid query parameters.");
        options = parseListQuery(req.query);
      } catch (error) { return res.status(400).json({ message: error.message }); }
      const { page, limit, orderBy } = options;
      const search = req.query.search?.trim();
      const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
      try {
        const [records, total] = await prisma.$transaction([
          table.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
          table.count({ where }),
        ], { isolationLevel: "RepeatableRead" });
        return res.json({ [plural]: records, page, limit, total, total_pages: Math.ceil(total / limit), has_next: page * limit < total, has_previous: page > 1 });
      } catch (error) { return handleError(error, res); }
    },
    async get(req, res) {
      try {
        const record = await table.findUnique({ where: { id: req.referenceId } });
        if (!record) return res.status(404).json({ message: `${label} not found.` });
        return res.json({ [singular]: record });
      } catch (error) { return handleError(error, res); }
    },
    create: (req, res) => save(req, res, false),
    update: (req, res) => save(req, res, true),
    async delete(req, res) {
      try {
        await table.delete({ where: { id: req.referenceId } });
        return res.status(204).end();
      } catch (error) { return handleError(error, res); }
    },
  };
};
