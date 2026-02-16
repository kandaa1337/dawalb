import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/requireAuth.js";

export const pharmaciesRouter = Router();

// GET /api/pharmacies?query=&city=&limit=&offset=
pharmaciesRouter.get("/", async (req, res, next) => {
  try {
    const query = (req.query.query || "").toString().trim();
    const city = (req.query.city || "").toString().trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);

    const where = {
      AND: [
        { isActive: true },

        query
          ? {
              OR: [
                { name: { contains: query } },

                // Address string fields
                { address: { raw: { contains: query } } },
                { address: { street: { contains: query } } },
                { address: { building: { contains: query } } },

                // Relations: City/Region/Country names
                { address: { city: { name: { contains: query } } } },
                { address: { region: { name: { contains: query } } } },
                { address: { country: { name: { contains: query } } } },

                // Chain name
                { chain: { name: { contains: query } } },
              ],
            }
          : {},

        // фильтр по city из отдельного инпута
        city ? { address: { city: { name: { contains: city } } } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.pharmacy.findMany({
        where,
        include: {
          chain: { select: { id: true, name: true } },
          address: {
            include: {
              city: { select: { id: true, name: true } },
              region: { select: { id: true, name: true } },
              country: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.pharmacy.count({ where }),
    ]);

    res.json({ ok: true, items, total, limit, offset });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/pharmacies/:pharmacyId/conversations
 * Get or create conversation between current user and pharmacy. Returns { conversationId }.
 */
pharmaciesRouter.post("/:pharmacyId/conversations", requireAuth, async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    let conv = await prisma.pharmacyConversation.findUnique({
      where: { pharmacyId_userId: { pharmacyId, userId: req.user.id } },
    });
    if (!conv) {
      conv = await prisma.pharmacyConversation.create({
        data: { pharmacyId, userId: req.user.id },
      });
    }
    res.json({ ok: true, conversationId: conv.id });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/pharmacies/:pharmacyId/payment-methods
 * List enabled payment methods for this pharmacy (for reserve flow). Public.
 */
pharmaciesRouter.get("/:pharmacyId/payment-methods", async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const configs = await prisma.pharmacyPaymentMethod.findMany({
      where: { pharmacyId, isEnabled: true },
      include: { method: { select: { code: true, name: true, isActive: true } } },
    });
    const list = configs
      .filter((c) => c.method?.isActive)
      .map((c) => ({
        code: c.methodCode,
        name: c.method?.name ?? c.methodCode,
        payToIdentifier: c.payToIdentifier ?? null,
      }));
    res.json({ ok: true, paymentMethods: list });
  } catch (e) {
    next(e);
  }
});

// ————— Pharmacy reviews (must be before /:id) —————
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
}).strict();

/**
 * GET /api/pharmacies/:pharmacyId/reviews
 * List published reviews for pharmacy. Optionally include current user's review (any status).
 */
pharmaciesRouter.get("/:pharmacyId/reviews", optionalAuth, async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const reviews = await prisma.pharmacyReview.findMany({
      where: { pharmacyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    let myReview = null;
    const userId = req.user?.id;
    if (userId) {
      const mine = await prisma.pharmacyReview.findUnique({
        where: { pharmacyId_userId: { pharmacyId, userId } },
      });
      if (mine) myReview = { id: mine.id, rating: mine.rating, title: mine.title, body: mine.body, status: mine.status, createdAt: mine.createdAt };
    }

    res.json({
      ok: true,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        userName: r.user?.name ?? "Пользователь",
      })),
      myReview,
    });
  } catch (e) {
    next(e);
  }
});

pharmaciesRouter.get("/:pharmacyId/reviews/me", requireAuth, async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    const review = await prisma.pharmacyReview.findUnique({
      where: { pharmacyId_userId: { pharmacyId, userId: req.user.id } },
    });
    if (!review) return res.json({ ok: true, review: null });
    res.json({ ok: true, review: { id: review.id, rating: review.rating, title: review.title, body: review.body, status: review.status } });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/pharmacies/:pharmacyId/reviews
 * Create or update my review (one per user per pharmacy). Auth required.
 */
pharmaciesRouter.post("/:pharmacyId/reviews", requireAuth, async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    const data = reviewSchema.parse(req.body);

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const review = await prisma.pharmacyReview.upsert({
      where: { pharmacyId_userId: { pharmacyId, userId: req.user.id } },
      update: { rating: data.rating, title: data.title ?? undefined, body: data.body ?? undefined },
      create: {
        pharmacyId,
        userId: req.user.id,
        rating: data.rating,
        title: data.title ?? null,
        body: data.body ?? null,
        status: "PUBLISHED",
      },
    });
    res.json({ ok: true, review: { id: review.id, rating: review.rating, title: review.title, body: review.body } });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ ok: false, error: "VALIDATION", details: e.errors });
    next(e);
  }
});

/**
 * DELETE /api/pharmacies/:pharmacyId/reviews/me
 * Delete current user's review for this pharmacy.
 */
pharmaciesRouter.delete("/:pharmacyId/reviews/me", requireAuth, async (req, res, next) => {
  try {
    const pharmacyId = req.params.pharmacyId;
    await prisma.pharmacyReview.deleteMany({
      where: { pharmacyId, userId: req.user.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/pharmacies/:id/products
 * Public list of active products (offers) for a pharmacy.
 */
pharmaciesRouter.get("/:id/products", async (req, res, next) => {
  try {
    const pharmacyId = req.params.id;
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, isActive: true },
    });
    if (!pharmacy || !pharmacy.isActive) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const offers = await prisma.offer.findMany({
      where: {
        pharmacyId,
        isDeleted: false,
        isFrozen: false,
      },
      include: {
        sku: {
          include: {
            product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            categories: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const products = offers.map((o) => ({
      id: o.id,
      name: o.sku?.product?.translations?.[0]?.name ?? "-",
      description: o.sku?.product?.translations?.[0]?.shortDescription ?? null,
      imageUrl: o.sku?.images?.[0]?.url ?? null,
      price: Number(o.bookingPrice),
      currency: o.currency,
      category: o.sku?.categories?.[0]?.category?.slug ?? null,
      stockQty: o.stockQty != null ? o.stockQty : null,
    }));

    res.json({ ok: true, products });
  } catch (e) {
    next(e);
  }
});

// GET /api/pharmacies/:id
pharmaciesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const item = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        chain: { select: { id: true, name: true } },
        address: {
          include: {
            city: { select: { id: true, name: true } },
            region: { select: { id: true, name: true } },
            country: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!item) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    res.json({ ok: true, item });
  } catch (e) {
    next(e);
  }
});
