import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireModerator } from "../middleware/requireModerator.js";

export const offersRouter = Router();

/** True if user can view a hidden (frozen/deleted/inactive pharmacy) offer: partner of this pharmacy, or moderator, or admin. */
async function canViewHiddenOffer(userId, pharmacyId) {
  if (!userId || !pharmacyId) return false;
  const [access, user] = await Promise.all([
    prisma.partnerUserPharmacyAccess.findFirst({
      where: { pharmacyId, partnerUser: { userId } },
      select: { pharmacyId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { select: { code: true } } } } },
    }),
  ]);
  if (access) return true;
  const roleCodes = (user?.roles ?? []).map((r) => r.role?.code).filter(Boolean);
  if (roleCodes.includes("MODERATOR") || roleCodes.includes("ADMIN")) return true;
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const superEmails = (process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (user?.email && (adminEmails.includes(user.email.toLowerCase()) || superEmails.includes(user.email.toLowerCase()))) return true;
  return false;
}

async function isPharmacyOwner(userId, pharmacyId) {
  if (!userId || !pharmacyId) return false;
  const access = await prisma.partnerUserPharmacyAccess.findFirst({
    where: {
      pharmacyId,
      accessLevel: "OWNER",
      partnerUser: { userId },
    },
    select: { pharmacyId: true },
  });
  return !!access;
}

/**
 * GET /api/offers/:id
 * Public offer detail. If frozen/deleted/pharmacy inactive → 404 for guests; partner/moderator/admin can still view.
 */
offersRouter.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        sku: {
          include: {
            product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
            images: { orderBy: { sortOrder: "asc" } },
            categories: { include: { category: { include: { translations: { where: { locale: "EN" }, take: 1 } } } } },
          },
        },
        pharmacy: { include: { address: true } },
      },
    });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const isHidden = offer.isDeleted || offer.isFrozen || !offer.pharmacy?.isActive;
    if (isHidden) {
      const allowed = await canViewHiddenOffer(req.user?.id, offer.pharmacyId);
      if (!allowed) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const name = offer.sku?.product?.translations?.[0]?.name ?? "—";
    const description = offer.sku?.product?.translations?.[0]?.shortDescription ?? null;
    const category = offer.sku?.categories?.[0]?.category;
    const categoryName = category?.translations?.[0]?.name ?? null;
    const categorySlug = category?.slug ?? null;
    let isPartner = false;
    let isPharmacyOwnerFlag = false;
    if (req.user?.id && offer.pharmacyId) {
      const access = await prisma.partnerUserPharmacyAccess.findFirst({
        where: { pharmacyId: offer.pharmacyId, partnerUser: { userId: req.user.id } },
        select: { pharmacyId: true },
      });
      isPartner = !!access;
      isPharmacyOwnerFlag = await isPharmacyOwner(req.user.id, offer.pharmacyId);
    }
    res.json({
      ok: true,
      offer: {
        id: offer.id,
        name,
        description,
        imageUrl: offer.sku?.images?.[0]?.url ?? null,
        images: (offer.sku?.images ?? []).map((i) => i.url),
        price: Number(offer.bookingPrice),
        walkInPrice: offer.walkInPrice ? Number(offer.walkInPrice) : null,
        currency: offer.currency,
        inStock: offer.inStock,
        isFrozen: offer.isFrozen,
        isDeleted: offer.isDeleted,
        frozenReason: offer.isFrozen ? offer.frozenReason : null,
        deletedReason: offer.isDeleted ? offer.deletedReason : null,
        isPartner,
        isPharmacyOwner: isPharmacyOwnerFlag,
        pharmacy: offer.pharmacy
          ? {
              id: offer.pharmacy.id,
              name: offer.pharmacy.name,
              logoUrl: offer.pharmacy.logoUrl ?? null,
              phone: offer.pharmacy.phone,
              address: offer.pharmacy.address?.raw ?? null,
              isActive: offer.pharmacy.isActive,
            }
          : null,
        categoryName,
        categorySlug,
        stockQty: offer.stockQty != null ? offer.stockQty : null,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/offers/:id
 * Pharmacy owner can edit own offer/product data.
 * Body: { name?, description?, imageUrl?, price?, stockQty?, currency? }
 */
offersRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { sku: { include: { product: true, images: { orderBy: { sortOrder: "asc" } } } } },
    });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const owner = await isPharmacyOwner(req.user.id, offer.pharmacyId);
    if (!owner) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const rawName = req.body?.name;
    const rawDescription = req.body?.description;
    const rawImageUrl = req.body?.imageUrl;
    const rawPrice = req.body?.price;
    const rawStockQty = req.body?.stockQty;
    const rawCurrency = req.body?.currency;

    const hasName = rawName !== undefined;
    const hasDescription = rawDescription !== undefined;
    const hasImageUrl = rawImageUrl !== undefined;
    const hasPrice = rawPrice !== undefined;
    const hasStockQty = rawStockQty !== undefined;
    const hasCurrency = rawCurrency !== undefined;

    if (hasName) {
      const name = String(rawName ?? "").trim();
      if (!name || name.length > 300) return res.status(400).json({ ok: false, error: "VALIDATION" });
    }
    if (hasDescription) {
      const description = rawDescription == null ? null : String(rawDescription).trim();
      if (description && description.length > 5000) return res.status(400).json({ ok: false, error: "VALIDATION" });
    }
    if (hasImageUrl) {
      const imageUrl = rawImageUrl == null ? null : String(rawImageUrl).trim();
      if (imageUrl && !imageUrl.startsWith("/") && !/^https?:\/\//i.test(imageUrl)) {
        return res.status(400).json({ ok: false, error: "VALIDATION" });
      }
    }
    if (hasPrice) {
      const price = Number(rawPrice);
      if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ ok: false, error: "VALIDATION" });
    }
    if (hasStockQty) {
      if (rawStockQty !== null) {
        const stockQty = Number(rawStockQty);
        if (!Number.isInteger(stockQty) || stockQty < 1) return res.status(400).json({ ok: false, error: "VALIDATION" });
      }
    }
    if (hasCurrency) {
      const currency = String(rawCurrency ?? "").trim().toUpperCase();
      if (!["USD", "LBP"].includes(currency)) return res.status(400).json({ ok: false, error: "VALIDATION" });
    }

    await prisma.$transaction(async (tx) => {
      if (hasName || hasDescription) {
        const existing = await tx.productTranslation.findUnique({
          where: { productId_locale: { productId: offer.sku.productId, locale: "EN" } },
        });
        const nextName = hasName ? String(rawName).trim() : (existing?.name ?? "Product");
        const nextDescription = hasDescription ? (rawDescription == null ? null : String(rawDescription).trim()) : (existing?.shortDescription ?? null);
        if (existing) {
          await tx.productTranslation.update({
            where: { id: existing.id },
            data: {
              name: nextName,
              shortDescription: nextDescription,
            },
          });
        } else {
          await tx.productTranslation.create({
            data: {
              productId: offer.sku.productId,
              locale: "EN",
              name: nextName,
              shortDescription: nextDescription,
            },
          });
        }
      }

      if (hasPrice || hasStockQty || hasCurrency) {
        await tx.offer.update({
          where: { id: offer.id },
          data: {
            ...(hasPrice && { bookingPrice: Number(rawPrice) }),
            ...(hasStockQty && { stockQty: rawStockQty == null ? null : Number(rawStockQty) }),
            ...(hasCurrency && { currency: String(rawCurrency).trim().toUpperCase() }),
          },
        });
      }

      if (hasImageUrl) {
        const imageUrl = rawImageUrl == null ? null : String(rawImageUrl).trim();
        await tx.skuImage.deleteMany({ where: { skuId: offer.skuId } });
        if (imageUrl) {
          await tx.skuImage.create({
            data: { skuId: offer.skuId, url: imageUrl, sortOrder: 0 },
          });
        }
      }
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/offers/:id/freeze
 * Moderator: hide offer with reason, notify user (we notify pharmacy partners).
 */
offersRouter.post("/:id/freeze", requireAuth, requireModerator, async (req, res, next) => {
  try {
    const reason = (req.body?.reason ?? "").toString().trim();
    if (!reason) return res.status(400).json({ ok: false, error: "REASON_REQUIRED" });
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { pharmacy: { include: { access: { include: { partnerUser: { select: { userId: true } } } } } } },
    });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (offer.isFrozen) return res.status(400).json({ ok: false, error: "ALREADY_FROZEN" });

    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offer.id },
        data: {
          isFrozen: true,
          frozenReason: reason,
          frozenAt: new Date(),
          frozenByUserId: req.user.id,
        },
      });
      const userIds = [...new Set(offer.pharmacy.access.map((a) => a.partnerUser.userId))];
      for (const userId of userIds) {
        await tx.notification.create({
          data: {
            userId,
            type: "OFFER_FROZEN",
            title: "Товар заморожен",
            body: `Товар (оффер) скрыт с площадки. Причина: ${reason}. Обратитесь в поддержку для разбирательств.`,
            refId: offer.id,
          },
        });
      }
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/offers/:id/unfreeze
 * Moderator: unfreeze offer.
 */
offersRouter.post("/:id/unfreeze", requireAuth, requireModerator, async (req, res, next) => {
  try {
    const offer = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (!offer.isFrozen) return res.status(400).json({ ok: false, error: "NOT_FROZEN" });
    await prisma.offer.update({
      where: { id: offer.id },
      data: { isFrozen: false, frozenReason: null, frozenAt: null, frozenByUserId: null },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/offers/:id/request-unfreeze
 * Partner (owner of pharmacy): request unfreeze, notifies admins.
 */
offersRouter.post("/:id/request-unfreeze", requireAuth, async (req, res, next) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { pharmacy: { include: { access: { include: { partnerUser: { select: { userId: true } } } } } } },
    });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (!offer.isFrozen) return res.status(400).json({ ok: false, error: "NOT_FROZEN" });
    const isPartner = offer.pharmacy?.access?.some((a) => a.partnerUser?.userId === req.user.id);
    if (!isPartner) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const superEmails = (process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const adminUsers = await prisma.user.findMany({
      where: { email: { in: [...adminEmails, ...superEmails] } },
      select: { id: true },
    });
    for (const u of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: "OFFER_UNFREEZE_REQUEST",
          title: "Запрос на разморозку товара",
          body: `Партнёр оспаривает заморозку. Оффер: ${offer.id}. Товар можно разморозить в админке.`,
          refId: offer.id,
        },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/offers/:id/delete
 * Admin: delete (soft) offer with reason, notify pharmacy partners.
 */
offersRouter.post("/:id/delete", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const reason = (req.body?.reason ?? "Removed by admin").toString().trim() || "Removed by admin";
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { pharmacy: { include: { access: { include: { partnerUser: { select: { userId: true } } } } } } },
    });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (offer.isDeleted) return res.status(400).json({ ok: false, error: "ALREADY_DELETED" });

    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offer.id },
        data: {
          isDeleted: true,
          deletedReason: reason,
          deletedAt: new Date(),
          deletedByUserId: req.user.id,
        },
      });
      const userIds = [...new Set(offer.pharmacy.access.map((a) => a.partnerUser.userId))];
      for (const userId of userIds) {
        await tx.notification.create({
          data: {
            userId,
            type: "OFFER_DELETED",
            title: "Товар удалён",
            body: `Товар удалён с площадки. Причина: ${reason}.`,
            refId: offer.id,
          },
        });
      }
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/offers/:id/restore
 * Admin: restore (soft-undelete) offer.
 */
offersRouter.post("/:id/restore", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const offer = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!offer) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (!offer.isDeleted) return res.status(400).json({ ok: false, error: "NOT_DELETED" });
    await prisma.offer.update({
      where: { id: offer.id },
      data: { isDeleted: false, deletedReason: null, deletedAt: null, deletedByUserId: null },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
