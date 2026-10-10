const { randomUUID } = require("node:crypto");
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { validateUser } = require("../utils/user");
const { seedFacilities } = require("./seedFacilities");

async function seedUsers() {
  if (await prisma.user.count()) {
    console.log("Users table is not empty; skipped user seed.");
    return;
  }
  const password = process.env.SEED_PASSWORD ?? "Password123";
  const accounts = [
    { email: "user1@example.com", user_name: "user1", role: "user" },
    { email: "user2@example.com", user_name: "user2", role: "user" },
    { email: "employee1@example.com", user_name: "employee1", role: "employee" },
    { email: "employee2@example.com", user_name: "employee2", role: "employee" },
  ];
  for (const account of accounts) {
    const message = validateUser({ ...account, password }, false, true);
    if (message) throw new Error(`Invalid seed account: ${message}`);
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await prisma.user.createMany({
    data: accounts.map((account) => ({ ...account, id: randomUUID(), password: hash })),
    skipDuplicates: true,
  });
  console.log(`Seeded ${result.count} accounts; skipped ${accounts.length - result.count} existing accounts.`);
}

async function main() {
  await seedUsers();
  await seedFacilities(prisma);
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
