import pkg from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const { PrismaClient } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });
globalThis.__prisma = prisma;
