const { validateWindow } = require("../utils/reservation");
async function seedReservations(prisma) {
  const count = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('LOCK TABLE "reservations" IN EXCLUSIVE MODE');
    if (await tx.reservation.count()) return 0;
    const users = await tx.user.findMany({ orderBy: { id: "asc" }, take: 2, select: { id: true } });
    const facilities = await tx.facility.findMany({ orderBy: { id: "asc" }, take: 2, select: { id: true } });
    if (!users.length || !facilities.length) throw new Error("Reservation seed requires existing users and facilities.");
    const tomorrow = new Date(Date.now() + (24 + 7) * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const [index, status] of ["new", "processed", "done", "rejected"].entries()) {
      const hour = 9 + index * 2;
      const start_time = new Date(`${tomorrow}T${String(hour).padStart(2, "0")}:00:00+07:00`);
      const end_time = new Date(start_time.getTime() + 60 * 60 * 1000);
      validateWindow(start_time, end_time);
      await tx.reservation.create({ data: {
        user_id: users[index % users.length].id, facility_id: facilities[index % facilities.length].id,
        start_time, end_time, status, reason: status === "rejected" ? "Example rejected reservation." : null,
      } });
    }
    return 4;
  });
  console.log(count ? `Seeded ${count} reservations.` : "Reservations table is not empty; skipped reservation seed.");
}
module.exports = { seedReservations };
