import { Router } from "express";
import { prisma } from "../db/prisma.js";

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
