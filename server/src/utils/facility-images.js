const { randomUUID } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
const uploadRoot = path.resolve(__dirname, "../../public/uploads");
const directory = path.join(uploadRoot, "facilities");

function imageExtension(file) {
  const b = file.buffer;
  if (file.mimetype === "image/png" && b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && b.toString("ascii", 12, 16) === "IHDR") return "png";
  if (file.mimetype === "image/jpeg" && b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255 && b[b.length - 2] === 255 && b[b.length - 1] === 217) return "jpg";
  if (file.mimetype === "image/webp" && b.length >= 16 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function removeImages(urls) {
  for (const url of urls) {
    if (!/^\/uploads\/facilities\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(url)) continue;
    try { await fs.unlink(path.join(directory, path.basename(url))); }
    catch (error) { if (error.code !== "ENOENT") console.error("Could not remove facility image:", error.message); }
  }
}

async function storeImages(files, urls) {
  await fs.mkdir(directory, { recursive: true });
  for (const file of files) {
    const filename = `${randomUUID()}.${imageExtension(file)}`;
    const url = `/uploads/facilities/${filename}`;
    urls.push(url); // Track even a partially written file for cleanup.
    await fs.writeFile(path.join(directory, filename), file.buffer, { flag: "wx" });
  }
}

module.exports = { uploadRoot, imageExtension, storeImages, removeImages };
