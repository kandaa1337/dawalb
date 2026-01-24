import "dotenv/config";
import { defineConfig, env } from "prisma/config";

import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  schema: path.join("prisma", "schema"),
   migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  }
} satisfies PrismaConfig;
