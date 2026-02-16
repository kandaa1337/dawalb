import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const catalogRouter = Router();

/**
 * GET /api/payment-methods
 * List active payment methods (for pharmacy setup).
 */
catalogRouter.get("/payment-methods", async (req, res, next) => {
  try {
    const list = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    res.json({ ok: true, paymentMethods: list.map((m) => ({ code: m.code, name: m.name })) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/categories
 * List active categories. ?parentId= -> only roots; ?parentId=xxx -> children of xxx.
 */
catalogRouter.get("/categories", async (req, res, next) => {
  try {
    const parentId = req.query.parentId !== undefined ? (req.query.parentId || null) : undefined;
    const where = { isActive: true };
    if (parentId !== undefined) where.parentId = parentId;

    const list = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        translations: { where: { locale: "EN" }, take: 1 },
      },
    });
    const categories = list.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.translations[0]?.name ?? c.slug,
      parentId: c.parentId,
      imageName: `${c.slug}.png`,
    }));
    res.json({ ok: true, categories });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/categories/tree
 * All root categories with their children (for home random pick).
 */
catalogRouter.get("/categories/tree", async (req, res, next) => {
  try {
    const roots = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: {
        translations: { where: { locale: "EN" }, take: 1 },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: { translations: { where: { locale: "EN" }, take: 1 } },
        },
      },
    });
    const tree = roots.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.translations[0]?.name ?? r.slug,
      imageName: `${r.slug}.png`,
      children: (r.children || []).map((ch) => ({
        id: ch.id,
        slug: ch.slug,
        name: ch.translations[0]?.name ?? ch.slug,
        imageName: `${ch.slug}.png`,
      })),
    }));
    res.json({ ok: true, tree });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/search?q=...
 * Search medicines (offers by product name/category) and pharmacies.
 */
catalogRouter.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || req.query.query || "").toString().trim();
    const category = (req.query.category || "").toString().trim();
    const limitMed = Math.min(parseInt(req.query.limit_med || "20", 10) || 20, 50);
    const limitPharm = Math.min(parseInt(req.query.limit_pharm || "20", 10) || 20, 50);
    const regionsRaw = (req.query.regions || req.query.region || "").toString();
    const regions = regionsRaw
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .filter((r) => !["all", "all lebanon"].includes(r.toLowerCase()));

    const regionAddressPredicates = regions.flatMap((region) => ([
      { address: { region: { name: region } } },
      { address: { city: { region: { name: region } } } },
      { address: { city: { name: region } } },
      { address: { raw: { contains: region } } },
      { address: { street: { contains: region } } },
    ]));

    const pharmacyRegionFilter = regionAddressPredicates.length
      ? { OR: regionAddressPredicates }
      : null;

    if (!q && !category) {
      return res.json({ ok: true, medicines: [], pharmacies: [] });
    }

    const medicineOr = [];
    if (q) {
      medicineOr.push({
        sku: {
          product: {
            translations: {
              some: { locale: "EN", name: { contains: q } },
            },
          },
        },
      });
    }
    if (category) {
      medicineOr.push({
        sku: {
          categories: {
            some: {
              category: { slug: category },
            },
          },
        },
      });
    }

    const [medicineOffers, pharmacies] = await Promise.all([
      prisma.offer.findMany({
        where: {
          isFrozen: false,
          isDeleted: false,
          pharmacy: {
            isActive: true,
            ...(pharmacyRegionFilter || {}),
          },
          ...(medicineOr.length ? { OR: medicineOr } : {}),
        },
        include: {
          sku: {
            include: {
              product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              categories: {
                include: {
                  category: {
                    include: {
                      translations: { where: { locale: "EN" }, take: 1 },
                      parent: {
                        include: {
                          translations: { where: { locale: "EN" }, take: 1 },
                        },
                      },
                    },
                  },
                },
                orderBy: { categoryId: "asc" },
              },
            },
          },
          pharmacy: {
            select: {
              id: true,
              name: true,
              address: {
                select: {
                  raw: true,
                  region: { select: { name: true } },
                  city: { select: { name: true, region: { select: { name: true } } } },
                },
              },
            },
          },
        },
        take: limitMed,
      }),
      q
        ? prisma.pharmacy.findMany({
            where: {
              isActive: true,
              AND: [
                ...(pharmacyRegionFilter ? [pharmacyRegionFilter] : []),
                {
                  OR: [
                    { name: { contains: q } },
                    { address: { raw: { contains: q } } },
                    { address: { street: { contains: q } } },
                    { chain: { name: { contains: q } } },
                  ],
                },
              ],
            },
            include: { address: { select: { raw: true } } },
            take: limitPharm,
          })
        : Promise.resolve([]),
    ]);

    const medicines = medicineOffers.map((o) => {
      const categoryNode = o.sku?.categories?.[0]?.category ?? null;
      const categorySlug = categoryNode?.parent ? (categoryNode.parent.slug ?? null) : (categoryNode?.slug ?? null);
      const subcategorySlug = categoryNode?.parent ? (categoryNode.slug ?? null) : null;
      const categoryName = categoryNode?.parent
        ? (categoryNode.parent.translations?.[0]?.name ?? categoryNode.parent.slug ?? null)
        : (categoryNode?.translations?.[0]?.name ?? categoryNode?.slug ?? null);
      const subcategoryName = categoryNode?.parent
        ? (categoryNode.translations?.[0]?.name ?? categoryNode.slug ?? null)
        : null;
      const pharmacyRegion =
        o.pharmacy?.address?.region?.name ||
        o.pharmacy?.address?.city?.region?.name ||
        o.pharmacy?.address?.city?.name ||
        o.pharmacy?.address?.raw ||
        null;
      return {
        id: o.id,
        name: o.sku?.product?.translations?.[0]?.name ?? "-",
        imageUrl: o.sku?.images?.[0]?.url ?? null,
        price: Number(o.bookingPrice),
        currency: o.currency,
        categorySlug,
        subcategorySlug,
        categoryName,
        subcategoryName,
        pharmacyName: o.pharmacy?.name,
        pharmacyRegion,
        pharmacyId: o.pharmacy?.id,
      };
    });

    const pharmaciesList = pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address?.raw ?? null,
    }));

    res.json({ ok: true, medicines, pharmacies: pharmaciesList });
  } catch (e) {
    next(e);
  }
});
