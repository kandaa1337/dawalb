import { Router } from "express";
import { z } from "zod";
import { registerUser, loginUser, logoutSession } from "../services/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

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
