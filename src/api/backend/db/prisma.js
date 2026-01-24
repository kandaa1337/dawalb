import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const { PrismaClient } = prismaPkg;

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });
globalThis.__prisma = prisma;
