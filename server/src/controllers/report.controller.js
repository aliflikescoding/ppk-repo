const prisma = require("../config/prisma");
const { isStaff, reportInclude, validateReport, parseReportQuery, handleReportError, serializeReport } = require("../utils/report");
const { photoUrl, storePhoto, removePhoto, imageExtension } = require("../utils/report-images");

async function list(req, res, userId) {
  let options;
  try { options = parseReportQuery(req.query); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  const { page, limit, where, orderBy } = options;
  if (userId) where.user_id = userId;
  else if (!isStaff(req.user)) where.user_id = req.user.id;
  try {
    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: reportInclude }),
      prisma.report.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return res.json({ reports: reports.map(serializeReport), page, limit, total, total_pages: Math.ceil(total / limit), has_next: page * limit < total, has_previous: page > 1 });
  } catch (error) { return handleReportError(error, res); }
}
exports.list = (req, res) => list(req, res);
exports.mine = (req, res) => list(req, res, req.user.id);
exports.byUser = (req, res) => {
  if (!isStaff(req.user) && req.params.userId.toLowerCase() !== req.user.id.toLowerCase()) return res.status(403).json({ message: "You can only read your own reports." });
  return list(req, res, req.params.userId.toLowerCase());
};
exports.get = async (req, res) => {
  try {
    const where = { id: req.reportId, ...(!isStaff(req.user) ? { user_id: req.user.id } : {}) };
    const report = await prisma.report.findFirst({ where, include: reportInclude });
    if (!report) return res.status(404).json({ message: "Report not found." });
    return res.json({ report: serializeReport(report) });
  } catch (error) { return handleReportError(error, res); }
};
async function save(req, res, partial) {
  if (req.file && !imageExtension(req.file)) return res.status(400).json({ message: "Report photos must be PNG, JPEG, or WebP files with matching content." });
  const message = validateReport(req.body, partial, Boolean(req.file));
  if (message) return res.status(400).json({ message });
  const { reason, ...data } = req.body;
  if (data.description !== undefined) data.description = data.description.trim();
  if (reason !== undefined) data.reaseon = reason === null ? null : reason.trim();
  let uploadedUrl;
  try {
    let previous;
    if (partial && (req.file || data.photo_report !== undefined)) {
      previous = await prisma.report.findFirst({ where: { id: req.reportId } });
      if (!previous) return res.status(404).json({ message: "Report not found." });
    }
    for (const [key, model] of [["facility_id", "facility"], ["category_id", "reportCategory"]]) {
      if (data[key] !== undefined && !await prisma[model].findUnique({ where: { id: data[key] }, select: { id: true } })) return res.status(400).json({ message: `${key} does not exist.` });
    }
    if (req.file) {
      uploadedUrl = photoUrl(req.file);
      await storePhoto(req.file, uploadedUrl);
      data.photo_report = uploadedUrl;
    }
    const report = partial
      ? await prisma.report.update({ where: { id: req.reportId }, data, include: reportInclude })
      : await prisma.report.create({ data: { ...data, user_id: req.user.id, status: "new" }, include: reportInclude });
    if (previous) await removePhoto(previous.photo_report);
    return res.status(partial ? 200 : 201).json({ report: serializeReport(report) });
  } catch (error) {
    await removePhoto(uploadedUrl);
    return handleReportError(error, res);
  }
}
exports.create = (req, res) => save(req, res, false);
exports.update = (req, res) => save(req, res, true);
exports.delete = async (req, res) => {
  try {
    const report = await prisma.report.delete({ where: { id: req.reportId } });
    await removePhoto(report.photo_report);
    return res.status(204).end();
  } catch (error) { return handleReportError(error, res); }
};
