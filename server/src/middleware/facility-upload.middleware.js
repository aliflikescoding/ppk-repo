const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20, fields: 6, fieldSize: 16 * 1024, parts: 26 },
}).array("images", 20);

module.exports = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  upload(req, res, (error) => {
    if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Each image must be at most 5 MB." : "Invalid upload. Use images for up to 20 files and supported facility fields." });
    for (const field of ["capacity", "type_id", "location_id"]) {
      if (typeof req.body[field] === "string" && /^[1-9]\d*$/.test(req.body[field])) req.body[field] = Number(req.body[field]);
    }
    if (["true", "false"].includes(req.body.is_active)) req.body.is_active = req.body.is_active === "true";
    if (typeof req.body.image_urls === "string") {
      try { req.body.image_urls = JSON.parse(req.body.image_urls); }
      catch { return res.status(400).json({ message: "image_urls must be a JSON array." }); }
    }
    if (req.files.length && req.body.image_urls !== undefined) return res.status(400).json({ message: "Send images or image_urls, not both." });
    if (req.files.length) req.body.image_urls = []; // Allows image-only partial updates.
    return next();
  });
};
