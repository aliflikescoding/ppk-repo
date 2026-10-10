const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 16 * 1024, parts: 7 },
}).single("photo_report");

module.exports = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  upload(req, res, (error) => {
    if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Report photo must be at most 5 MB." : "Invalid upload. Send one file in photo_report and supported report fields." });
    for (const field of ["facility_id", "category_id"]) {
      if (typeof req.body[field] === "string" && /^[1-9]\d*$/.test(req.body[field])) req.body[field] = Number(req.body[field]);
    }
    if (req.file && req.body.photo_report !== undefined) return res.status(400).json({ message: "Send a photo_report file or URL, not both." });
    return next();
  });
};
