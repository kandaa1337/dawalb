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

const BASE_CATEGORIES = [
  { slug: "vitamins-minerals", name: "Витамины и минералы", sortOrder: 1 },
  { slug: "kids-moms", name: "Товары для детей и матерей", sortOrder: 2 },
  { slug: "beauty-care", name: "Красота и уход", sortOrder: 3 },
  { slug: "medicines-prevention", name: "Лекарства и профилактические средства", sortOrder: 4 },
  { slug: "sport-health", name: "Спорт и здоровье", sortOrder: 5 },
];

const SUBCATEGORIES = {
  "sport-health": [
    { slug: "sport-protein-bars", name: "Протеиновые батончики" },
    { slug: "sport-protein", name: "Протеин" },
    { slug: "sport-fat-burners", name: "Жиросжигатели" },
    { slug: "sport-amino-acids", name: "Аминокислоты" },
    { slug: "sport-vitamins-sport", name: "Спортивные витамины" },
  ],
  "vitamins-minerals": [
    { slug: "vitamins-multivitamin", name: "Поливитамины" },
    { slug: "vitamins-vitamin-d", name: "Витамин D" },
    { slug: "vitamins-vitamin-c", name: "Витамин C" },
    { slug: "vitamins-minerals", name: "Минералы" },
    { slug: "vitamins-omega", name: "Омега-3" },
  ],
  "kids-moms": [
    { slug: "kids-baby-food", name: "Детское питание" },
    { slug: "kids-hygiene", name: "Гигиена для детей" },
    { slug: "kids-vitamins", name: "Витамины для детей" },
    { slug: "kids-moms-care", name: "Уход для мам" },
  ],
  "beauty-care": [
    { slug: "beauty-skincare", name: "Уход за кожей" },
    { slug: "beauty-hair", name: "Волосы" },
    { slug: "beauty-suncare", name: "Солнцезащита" },
    { slug: "beauty-hygiene", name: "Гигиена" },
  ],
  "medicines-prevention": [
    { slug: "meds-pain", name: "Обезболивающие" },
    { slug: "meds-cold", name: "Простуда и грипп" },
    { slug: "meds-digestion", name: "Пищеварение" },
    { slug: "meds-allergy", name: "Аллергия" },
    { slug: "meds-heart", name: "Сердце и сосуды" },
  ],
};

async function ensureBaseCategories() {
  const parentIds = {};
  for (let i = 0; i < BASE_CATEGORIES.length; i++) {
    const { slug, name, sortOrder } = BASE_CATEGORIES[i];
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { sortOrder, isActive: true, parentId: null },
      create: { slug, isActive: true, sortOrder },
    });
    parentIds[slug] = cat.id;
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: cat.id, locale: "EN" } },
      update: { name },
      create: { categoryId: cat.id, locale: "EN", name },
    });
  }
  for (const [parentSlug, subs] of Object.entries(SUBCATEGORIES)) {
    const parentId = parentIds[parentSlug];
    if (!parentId) continue;
    for (let j = 0; j < subs.length; j++) {
      const { slug, name } = subs[j];
      const sub = await prisma.category.upsert({
        where: { slug },
        update: { parentId, isActive: true, sortOrder: j },
        create: { slug, parentId, isActive: true, sortOrder: j },
      });
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: sub.id, locale: "EN" } },
        update: { name },
        create: { categoryId: sub.id, locale: "EN", name },
      });
    }
  }
}

async function ensurePaymentMethods() {
  const methods = [
    { code: "WHISH", name: "WHISH", isActive: true },
    { code: "OMT", name: "OMT", isActive: true },
    { code: "CREDIT_CARD", name: "Credit Card", isActive: true },
  ];
  for (const m of methods) {
    await prisma.paymentMethod.upsert({
      where: { code: m.code },
      update: { name: m.name, isActive: m.isActive },
      create: m,
    });
  }
}

async function main() {
  console.log("🌱 Seed started");

  await ensureRoles();
  console.log("✅ Roles ensured");

  await ensurePaymentMethods();
  console.log("✅ Payment methods ensured");

  await ensureBaseCategories();
  console.log("✅ Base categories ensured");

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
