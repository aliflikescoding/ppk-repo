import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --env-file=.env src/scripts/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
