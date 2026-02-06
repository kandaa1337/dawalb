// src/api/prisma/seed.js
import dotenv from "dotenv";

// ВАЖНО: грузим .env именно из src/api/.env (на 1 уровень выше папки prisma)
dotenv.config({ path: new URL("../.env", import.meta.url) });

import { prisma } from "../backend/db/prisma.js";

const ROLE_NAMES = {
  USER: "User",
  PARTNER_OWNER: "Partner owner",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

async function hashPassword(password) {
  // Пытаемся bcryptjs, потом bcrypt (что есть в зависимостях)
  try {
    const mod = await import("bcryptjs");
    const bcrypt = mod.default ?? mod;
    return await bcrypt.hash(password, 10);
  } catch {}
  try {
    const mod = await import("bcrypt");
    const bcrypt = mod.default ?? mod;
    return await bcrypt.hash(password, 10);
  } catch {}

  throw new Error("No bcrypt/bcryptjs installed. Install one or don't auto-create admin.");
}

async function ensureRoles() {
  const codes = Object.keys(ROLE_NAMES);

  for (const code of codes) {
    await prisma.role.upsert({
      where: { code }, // Role.code @unique
      update: { name: ROLE_NAMES[code] },
      create: { code, name: ROLE_NAMES[code] },
    });
  }
}

async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "").trim() || null;
  const phone = (process.env.ADMIN_PHONE || "").trim() || null;

  if (!email && !phone) {
    throw new Error("Set ADMIN_EMAIL or ADMIN_PHONE in env");
  }

  // 1) ищем юзера
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  // 2) если нет — создаём ТОЛЬКО если задан ADMIN_PASSWORD
  if (!user) {
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
    if (!adminPassword) {
      throw new Error(
        "Admin user not found. Create account via UI first OR set ADMIN_PASSWORD to auto-create."
      );
    }

    const passwordHash = await hashPassword(adminPassword);

    user = await prisma.user.create({
      data: {
        email,
        phone,
        name: "Admin",
        locale: "EN",
        credential: { create: { passwordHash } },
      },
    });
  }

  // 3) находим роль ADMIN
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  if (!adminRole) throw new Error("ADMIN role missing (ensureRoles failed?)");

  // 4) назначаем роль (через составной ключ @@id([userId, roleId]))
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  return user;
}

async function main() {
  console.log("🌱 Seed started");

  await ensureRoles();
  console.log("✅ Roles ensured");

  const adminUser = await ensureAdminUser();
  console.log(`✅ Admin ensured: ${adminUser.email || adminUser.phone} (${adminUser.id})`);

  console.log("🎉 Done");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
