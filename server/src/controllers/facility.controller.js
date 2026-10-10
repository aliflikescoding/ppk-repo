const prisma = require("../config/prisma");
const { facilityInclude, validateFacility, parseListQuery, handleFacilityError } = require("../utils/facility");
const { imageExtension, storeImages, removeImages } = require("../utils/facility-images");

exports.getFacilities = async (req, res) => {
  let options;
  try { options = parseListQuery(req.query); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  const { page, limit, where, orderBy } = options;
  try {
    const [facilities, total] = await prisma.$transaction([
      prisma.facility.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: facilityInclude }),
      prisma.facility.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return res.json({ facilities, page, limit, total, total_pages: Math.ceil(total / limit), has_next: page * limit < total, has_previous: page > 1 });
  } catch (error) { return handleFacilityError(error, res); }
};

exports.getFacility = async (req, res) => {
  try {
    const facility = await prisma.facility.findUnique({ where: { id: req.facilityId }, include: facilityInclude });
    if (!facility) return res.status(404).json({ message: "Facility not found." });
    return res.json({ facility });
  } catch (error) { return handleFacilityError(error, res); }
};

async function save(req, res, partial) {
  const files = req.files || [];
  if (files.some((file) => !imageExtension(file))) return res.status(400).json({ message: "Images must be PNG, JPEG, or WebP files with matching content." });
  const message = validateFacility(req.body, partial);
  if (message) return res.status(400).json({ message });
  const { image_urls, ...data } = req.body;
  if (data.name !== undefined) data.name = data.name.trim();
  const uploadedUrls = [];
  try {
    let previous;
    if (partial) {
      previous = await prisma.facility.findUnique({ where: { id: req.facilityId }, include: { images: true } });
      if (!previous) return res.status(404).json({ message: "Facility not found." });
    }
    for (const [field, model] of [["type_id", "facilityType"], ["location_id", "facilityLocation"]]) {
      if (data[field] !== undefined && !await prisma[model].findUnique({ where: { id: data[field] }, select: { id: true } })) {
        return res.status(400).json({ message: `${field} does not exist.` });
      }
    }
    if (files.length) await storeImages(files, uploadedUrls);
    if (image_urls !== undefined) data.images = {
      ...(partial ? { deleteMany: {} } : {}),
      create: (files.length ? uploadedUrls : image_urls).map((image_url) => ({ image_url })),
    };
    const facility = partial
      ? await prisma.facility.update({ where: { id: req.facilityId }, data, include: facilityInclude })
      : await prisma.facility.create({ data, include: facilityInclude });
    if (partial && image_urls !== undefined) await removeImages((previous.images || []).map((image) => image.image_url));
    return res.status(partial ? 200 : 201).json({ facility });
  } catch (error) {
    await removeImages(uploadedUrls);
    return handleFacilityError(error, res);
  }
}

exports.createFacility = (req, res) => save(req, res, false);
exports.updateFacility = (req, res) => save(req, res, true);
exports.deleteFacility = async (req, res) => {
  try {
    const images = await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.findUnique({ where: { id: req.facilityId }, include: { images: true } });
      if (!facility) throw { code: "P2025" };
      await tx.facilityImage.deleteMany({ where: { facility_id: req.facilityId } });
      await tx.facility.delete({ where: { id: req.facilityId } });
      return facility.images || [];
    });
    await removeImages(images.map((image) => image.image_url));
    return res.status(204).end();
  } catch (error) { return handleFacilityError(error, res); }
};
