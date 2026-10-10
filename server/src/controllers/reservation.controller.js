const prisma = require("../config/prisma");
const { isStaff, uuid } = require("../utils/report");
const { reservationInclude, problem, validateWindow, reservationData, listOptions, assertAvailable, handleError } = require("../utils/reservation");
async function list(req, res, userId, calendar = false) {
  try {
    const { page, limit, where, orderBy } = listOptions(req.query, calendar);
    if (!calendar) {
      if (userId) where.user_id = userId;
      else if (!isStaff(req.user)) where.user_id = req.user.id;
    }
    const [reservations, total] = await prisma.$transaction([
      prisma.reservation.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit,
        ...(calendar ? { select: { id: true, facility_id: true, start_time: true, end_time: true, status: true } } : { include: reservationInclude }) }),
      prisma.reservation.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return res.json({ reservations, page, limit, total, total_pages: Math.ceil(total / limit), has_next: page * limit < total, has_previous: page > 1 });
  } catch (error) { return handleError(error, res); }
}
exports.list = (req, res) => list(req, res);
exports.mine = (req, res) => list(req, res, req.user.id);
exports.calendar = (req, res) => list(req, res, null, true);
exports.byUser = (req, res) => {
  if (!isStaff(req.user) && req.user.id.toLowerCase() !== req.params.userId.toLowerCase()) return res.status(403).json({ message: "You can only read your own reservations." });
  return list(req, res, req.params.userId.toLowerCase());
};
exports.get = async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({ where: { id: req.reservationId, ...(!isStaff(req.user) ? { user_id: req.user.id } : {}) }, include: reservationInclude });
    if (!reservation) throw problem(404, "Reservation not found.");
    return res.json({ reservation });
  } catch (error) { return handleError(error, res); }
};
async function save(req, res, partial) {
  try {
    const userCancellation = partial && req.user.role === "user" && req.body?.status === "rejected" && Object.keys(req.body).length === 1;
    if (partial && !isStaff(req.user) && !userCancellation && req.body && (Object.hasOwn(req.body, "status") || Object.hasOwn(req.body, "reason"))) throw problem(403, "Only admins and employees can update status or reason.");
    const data = reservationData(req.body, partial, req.user.role === "admin");
    if (!partial) {
      data.user_id = data.user_id ?? req.user.id;
      if (!uuid(data.user_id)) throw problem(400, "user_id must be a UUID.");
      data.status = data.status ?? "new";
    }
    const reservation = await prisma.$transaction(async (tx) => {
      // Serializes reservation writes so concurrent approvals cannot double-book.
      await tx.$executeRawUnsafe('LOCK TABLE "reservations" IN SHARE ROW EXCLUSIVE MODE');
      const previous = partial ? await tx.reservation.findUnique({ where: { id: req.reservationId } }) : null;
      if (partial && !previous) throw problem(404, "Reservation not found.");
      if (partial && !isStaff(req.user) && previous.user_id !== req.user.id) throw problem(404, "Reservation not found.");
      if (userCancellation) {
        if (previous.status !== "new") throw problem(409, "Only new reservations can be cancelled.");
        if (previous.start_time.getTime() - Date.now() < 5 * 60 * 60 * 1000) throw problem(409, "Reservations must be cancelled at least 5 hours before the start time.");
        return tx.reservation.update({ where: { id: req.reservationId }, data: { status: "rejected", reason: "Cancelled by user." }, include: reservationInclude });
      }
      const candidate = { ...previous, ...data };
      validateWindow(candidate.start_time, candidate.end_time);
      const facility = await tx.facility.findUnique({ where: { id: candidate.facility_id }, select: { id: true, is_active: true } });
      if (!facility) throw problem(400, "facility_id does not exist.");
      if (req.user.role === "user" && !facility.is_active) throw problem(403, "This facility is inactive and cannot accept reservation requests.");
      if (!partial && !await tx.user.findUnique({ where: { id: data.user_id }, select: { id: true } })) throw problem(400, "user_id does not exist.");
      // All new requests check availability. Updates that occupy a slot recheck it.
      if (!partial || candidate.status === "done" || data.start_time || data.end_time || data.facility_id) await assertAvailable(tx, candidate, req.reservationId);
      return partial
        ? tx.reservation.update({ where: { id: req.reservationId }, data, include: reservationInclude })
        : tx.reservation.create({ data, include: reservationInclude });
    });
    return res.status(partial ? 200 : 201).json({ reservation });
  } catch (error) { return handleError(error, res); }
}
exports.create = (req, res) => save(req, res, false);
exports.update = (req, res) => save(req, res, true);
exports.delete = async (req, res) => {
  try { await prisma.reservation.delete({ where: { id: req.reservationId } }); return res.status(204).end(); }
  catch (error) { return handleError(error, res); }
};
