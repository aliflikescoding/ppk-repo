const { randomUUID } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
const { uploadRoot, imageExtension } = require("./facility-images");
const directory = path.join(uploadRoot, "reports");

async function removePhoto(url) {
  if (typeof url !== "string" || !/^\/uploads\/reports\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(url)) return;
  try { await fs.unlink(path.join(directory, path.basename(url))); }
  catch (error) { if (error.code !== "ENOENT") console.error("Could not remove report photo:", error.message); }
}
async function storePhoto(file, url) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, path.basename(url)), file.buffer, { flag: "wx" });
}
const photoUrl = file => `/uploads/reports/${randomUUID()}.${imageExtension(file)}`;
module.exports = { photoUrl, storePhoto, removePhoto, imageExtension };
