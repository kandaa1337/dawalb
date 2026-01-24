import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../db/prisma.js";

const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function sessionExpiresAt() {
  return new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function registerUser({ email, phone, password, name }, meta) {
  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });
  if (exists) {
    const err = new Error("USER_ALREADY_EXISTS");
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.create({
    data: { email: email ?? null, phone: phone ?? null, name: name ?? null },
  });

  const passwordHash = await argon2.hash(password);

  await prisma.userCredential.create({
    data: { userId: user.id, passwordHash },
  });

  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiresAt();

  await prisma.authSession.create({
    data: {
      userId: user.id,
      sessionToken,
      expiresAt,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  return { user, sessionToken, expiresAt };
}

export async function loginUser({ email, phone, password }, meta) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
    include: {
      credential: true,
      roles: { include: { role: true } },
    },
  });

  if (!user?.credential) {
    const err = new Error("INVALID_CREDENTIALS");
    err.status = 401;
    throw err;
  }

  const ok = await argon2.verify(user.credential.passwordHash, password);
  if (!ok) {
    const err = new Error("INVALID_CREDENTIALS");
    err.status = 401;
    throw err;
  }

  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiresAt();

  await prisma.authSession.create({
    data: {
      userId: user.id,
      sessionToken,
      expiresAt,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  return { user, sessionToken, expiresAt };
}

export async function findSession(sessionToken) {
  if (!sessionToken) return null;
  return prisma.authSession.findFirst({
    where: { sessionToken, expiresAt: { gt: new Date() } },
    include: {
      user: { include: { roles: { include: { role: true } } } },
    },
  });
}

export async function logoutSession(sessionToken) {
  if (!sessionToken) return;
  await prisma.authSession.deleteMany({ where: { sessionToken } });
}
