import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const SLOTS = ["side_left", "side_right", "mobile_bottom"];

export const bannersRouter = Router();

/**
 * GET /api/banners?slot=side_left|side_right|mobile_bottom
 * Public: list active banners for a slot (or all slots if no query).
 */
bannersRouter.get("/", async (req, res, next) => {
  try {
    const slot = req.query.slot;
    const where = { isActive: true };
    if (slot && SLOTS.includes(slot)) where.slot = slot;

    const list = await prisma.banner.findMany({
      where,
      orderBy: [{ slot: "asc" }, { sortOrder: "asc" }],
    });
    res.json({ ok: true, banners: list.map((b) => ({ id: b.id, slot: b.slot, imageUrl: b.imageUrl, link: b.link, sortOrder: b.sortOrder })) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/banners - list all (admin)
 */
bannersRouter.get("/admin/list", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const list = await prisma.banner.findMany({
      orderBy: [{ slot: "asc" }, { sortOrder: "asc" }],
    });
    res.json({ ok: true, banners: list });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/banners - create (admin). Body: { slot, imageUrl, link?, sortOrder? }
 */
bannersRouter.post("/admin", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const slot = (req.body?.slot ?? "").toString();
    const imageUrl = (req.body?.imageUrl ?? "").toString().trim();
    const link = (req.body?.link ?? "").toString().trim() || null;
    const sortOrder = parseInt(req.body?.sortOrder, 10) || 0;
    if (!SLOTS.includes(slot)) return res.status(400).json({ ok: false, error: "INVALID_SLOT", allowed: SLOTS });
    if (!imageUrl) return res.status(400).json({ ok: false, error: "IMAGE_REQUIRED" });

    const banner = await prisma.banner.create({
      data: { slot, imageUrl, link, sortOrder },
    });
    res.status(201).json({ ok: true, banner: { id: banner.id, slot: banner.slot, imageUrl: banner.imageUrl, link: banner.link, sortOrder: banner.sortOrder } });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/admin/banners/:id - update (admin)
 */
bannersRouter.patch("/admin/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const slot = req.body?.slot != null ? (req.body.slot + "").trim() : undefined;
    const imageUrl = req.body?.imageUrl != null ? (req.body.imageUrl + "").trim() : undefined;
    const link = req.body?.link !== undefined ? ((req.body.link + "").trim() || null) : undefined;
    const sortOrder = req.body?.sortOrder !== undefined ? parseInt(req.body.sortOrder, 10) : undefined;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;

    if (slot && !SLOTS.includes(slot)) return res.status(400).json({ ok: false, error: "INVALID_SLOT" });

    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        ...(slot && { slot }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(link !== undefined && { link }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ ok: true, banner: { id: updated.id, slot: updated.slot, imageUrl: updated.imageUrl, link: updated.link, sortOrder: updated.sortOrder, isActive: updated.isActive } });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/banners/:id
 */
bannersRouter.delete("/admin/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    await prisma.banner.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    next(e);
  }
});
