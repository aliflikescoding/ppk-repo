const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { uploadRoot } = require("../utils/facility-images");
const { removePhoto } = require("../utils/report-images");

const examples = [
  { facility: "Campus Meeting Room", category: "Furniture Damage", description: "The meeting room chair has a broken armrest. Please repair or replace it.", image: "damaged-chair.png" },
  { facility: "Campus Computer Laboratory", category: "Equipment Damage", description: "A computer laboratory monitor has a cracked screen and distorted display. Please replace it.", image: "damaged-monitor.png" },
];

async function seedReports(prisma) {
  const uploaded = [];
  try {
    const count = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "reports" IN EXCLUSIVE MODE');
      if (await tx.report.count()) return 0;
      const users = await tx.user.findMany({ orderBy: { id: "asc" }, take: 2, select: { id: true } });
      const facilities = await tx.facility.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } });
      if (!users.length || !facilities.length) throw new Error("Report seed requires existing users and facilities. Run the combined seed command first.");
      await fs.mkdir(path.join(uploadRoot, "reports"), { recursive: true });
      for (const [index, example] of examples.entries()) {
        const facility = facilities.find(item => item.name === example.facility) || facilities[index % facilities.length];
        let category = await tx.reportCategory.findFirst({ where: { name: example.category }, orderBy: { id: "asc" } });
        if (!category) category = await tx.reportCategory.create({ data: { name: example.category } });
        const filename = `${randomUUID()}.png`;
        const photo_report = `/uploads/reports/${filename}`;
        uploaded.push(photo_report);
        await fs.copyFile(path.join(__dirname, "../../prisma/seed-assets", example.image), path.join(uploadRoot, "reports", filename));
        await tx.report.create({ data: {
          user_id: users[index % users.length].id, facility_id: facility.id,
          category_id: category.id, status: "new", description: example.description, photo_report,
        } });
      }
      return examples.length;
    }, { timeout: 30000 });
    console.log(count ? `Seeded ${count} reports with damage photos.` : "Reports table is not empty; skipped report seed.");
  } catch (error) {
    for (const url of uploaded) await removePhoto(url);
    throw error;
  }
}

module.exports = { seedReports };
