const { randomUUID } = require("node:crypto");
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { publicUser, validateUser } = require("../utils/user");

async function main() {
  const data = {
    email: process.env.ADMIN_EMAIL,
    user_name: process.env.ADMIN_USER_NAME,
    password: process.env.ADMIN_PASSWORD,
  };
  const message = validateUser(data);
  if (message) throw new Error(`Set ADMIN_EMAIL, ADMIN_USER_NAME, and ADMIN_PASSWORD in .env: ${message}`);

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: publicUser });
  if (existing?.role === "admin") {
    console.log("Admin already exists; no changes made:", existing);
    return;
  }

  const password = await bcrypt.hash(data.password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin", password },
        select: publicUser,
      })
    : await prisma.user.create({
        data: { ...data, id: randomUUID(), password, role: "admin" },
        select: publicUser,
      });
  console.log(existing ? "User promoted to admin:" : "Admin created:", user);
}

main()
  .catch((error) => {
    console.error("Failed to create admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
