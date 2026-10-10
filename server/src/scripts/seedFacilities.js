const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { uploadRoot, removeImages } = require("../utils/facility-images");

const examples = [
  { name: "Campus Meeting Room", capacity: 12, type: "Meeting Room", location: "Main Building", image: "meeting-room.png" },
  { name: "Campus Computer Laboratory", capacity: 20, type: "Computer Laboratory", location: "Technology Building", image: "computer-lab.png" },
];

async function seedFacilities(prisma) {
  const uploaded = [];
  try {
    const count = await prisma.$transaction(async (tx) => {
      // Serialize seed runs and prevent inserts between the empty check and creation.
      await tx.$executeRawUnsafe('LOCK TABLE "facilities" IN EXCLUSIVE MODE');
      if (await tx.facility.count()) return 0;
      await fs.mkdir(path.join(uploadRoot, "facilities"), { recursive: true });
      for (const example of examples) {
        let type = await tx.facilityType.findFirst({ where: { name: example.type }, orderBy: { id: "asc" } });
        if (!type) type = await tx.facilityType.create({ data: { name: example.type } });
        let location = await tx.facilityLocation.findFirst({ where: { name: example.location }, orderBy: { id: "asc" } });
        if (!location) location = await tx.facilityLocation.create({ data: { name: example.location } });
        const filename = `${randomUUID()}.png`;
        const image_url = `/uploads/facilities/${filename}`;
        uploaded.push(image_url);
        await fs.copyFile(path.join(__dirname, "../../prisma/seed-assets", example.image), path.join(uploadRoot, "facilities", filename));
        await tx.facility.create({ data: {
          name: example.name, capacity: example.capacity, is_active: true,
          type_id: type.id, location_id: location.id,
          images: { create: { image_url } },
        } });
      }
      return examples.length;
    }, { timeout: 30000 });
    console.log(count ? `Seeded ${count} facilities with images.` : "Facilities table is not empty; skipped facility seed.");
  } catch (error) {
    await removeImages(uploaded);
    throw error;
  }
}

module.exports = { seedFacilities };

if (require.main === module) {
  const prisma = require("../config/prisma");
  seedFacilities(prisma)
    .catch((error) => {
      console.error("Failed to seed facilities:", error.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
