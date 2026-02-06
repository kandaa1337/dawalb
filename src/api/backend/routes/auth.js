import { Router } from "express";
import { z } from "zod";
import { registerUser, loginUser, logoutSession } from "../services/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import argon2 from "argon2";
import { prisma } from "../db/prisma.js";

const updateMeSchema = z
  .object({
    // если поле пришло — обновляем; если не пришло — не трогаем
    email: z.string().email().optional().nullable(),
    phone: z.string().min(6).optional().nullable(),
    name: z.string().min(1).optional().nullable(),
    locale: z.enum(["EN", "FR", "AR"]).optional(),
  })
  .strict();

export const authRouter = Router();

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sid";

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
}).refine((d) => d.email || d.phone, { message: "email or phone is required" });

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const { user, sessionToken, expiresAt } = await registerUser(
      data,
      { ip: req.ip, userAgent: req.headers["user-agent"] || null }
    );

    res.cookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: expiresAt,
      path: "/",
    });

    res.json({ ok: true, user: { id: user.id, email: user.email, phone: user.phone, name: user.name } });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(1),
}).refine((d) => d.email || d.phone, { message: "email or phone is required" });

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const { sessionToken, expiresAt } = await loginUser(
      data,
      { ip: req.ip, userAgent: req.headers["user-agent"] || null }
    );

    res.cookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: expiresAt,
      path: "/",
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const u = req.user;
  res.json({
    ok: true,
    user: {
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      roles: u.roles?.map((r) => r.role.code) || [],
    },
  });
});

authRouter.put("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateMeSchema.parse(req.body);

    const u = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    res.json({ ok: true, user: u });
  } catch (e) {
    next(e);
  }
});

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateMeSchema.parse(req.body);

    // соберём patch только из тех полей, которые реально передали
    const patch = {};
    if ("email" in data) patch.email = data.email || null;
    if ("phone" in data) patch.phone = data.phone || null;
    if ("name" in data) patch.name = data.name || null;
    if ("locale" in data) patch.locale = data.locale;

    // ничего не передали
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: "NO_FIELDS" });
    }

    // проверка уникальности email/phone (у тебя в модели User они unique)
    if ("email" in patch && patch.email) {
      const exists = await prisma.user.findFirst({
        where: { email: patch.email, NOT: { id: req.user.id } },
        select: { id: true },
      });
      if (exists) return res.status(400).json({ ok: false, error: "EMAIL_TAKEN" });
    }

    if ("phone" in patch && patch.phone) {
      const exists = await prisma.user.findFirst({
        where: { phone: patch.phone, NOT: { id: req.user.id } },
        select: { id: true },
      });
      if (exists) return res.status(400).json({ ok: false, error: "PHONE_TAKEN" });
    }

    // не даём оставить юзера вообще без email и phone (иначе потом логин невозможен)
    const current = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, phone: true },
    });

    const nextEmail = ("email" in patch) ? patch.email : current.email;
    const nextPhone = ("phone" in patch) ? patch.phone : current.phone;

    if (!nextEmail && !nextPhone) {
      return res.status(400).json({ ok: false, error: "EMAIL_OR_PHONE_REQUIRED" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: patch,
      select: { id: true, email: true, phone: true, name: true, locale: true },
    });

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

authRouter.put("/password", requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const cred = await prisma.userCredential.findUnique({
      where: { userId: req.user.id },
    });
    if (!cred) return res.status(400).json({ ok: false, error: "NO_CREDENTIAL" });

    const ok = await argon2.verify(cred.passwordHash, data.oldPassword);
    if (!ok) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

    const passwordHash = await argon2.hash(data.newPassword);

    await prisma.userCredential.update({
      where: { userId: req.user.id },
      data: { passwordHash },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { credential: true },
    });

    if (!user?.credential) {
      return res.status(400).json({ ok: false, error: "NO_PASSWORD_SET" });
    }

    const ok = await argon2.verify(user.credential.passwordHash, oldPassword);
    if (!ok) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

    const passwordHash = await argon2.hash(newPassword);

    await prisma.userCredential.update({
      where: { userId: req.user.id },
      data: { passwordHash },
    });

    // (опционально) убить все остальные сессии, кроме текущей
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (token) {
      await prisma.authSession.deleteMany({
        where: { userId: req.user.id, sessionToken: { not: token } },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    await logoutSession(token);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
