import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const partnersRouter = Router();

const applySchema = z.object({
  orgName: z.string().min(1),
  chainName: z.string().min(1),
  phone: z.string().min(3).optional().nullable(),
  website: z.string().min(3).optional().nullable(),
});

partnersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const partner = await prisma.partnerUser.findUnique({
      where: { userId: req.user.id },
      include: { org: { include: { chain: true } } },
    });

    res.json({ ok: true, partner });
  } catch (e) {
    next(e);
  }
});

const becomeSchema = z
  .object({
    // организация партнёра (может отличаться от chain)
    orgName: z.string().min(2).max(120),

    // сеть аптек
    chainName: z.string().min(2).max(120),
    legalName: z.string().min(2).max(200).optional(),
    website: z.string().url().optional(),
    phone: z.string().min(6).max(50).optional(),
  })
  .strict();

/**
 * POST /api/partners/become
 * Создаёт:
 *  - PharmacyChain (upsert по unique name)
 *  - PartnerOrg (ссылкой на chain)
 *  - PartnerUser (привязка текущего User -> Partner)
 */
partnersRouter.post("/become", requireAuth, async (req, res, next) => {
  try {
    const data = becomeSchema.parse(req.body);

    // если уже партнёр — просто вернём
    const existing = await prisma.partnerUser.findUnique({
      where: { userId: req.user.id },
      include: { org: { include: { chain: true } } },
    });
    if (existing) return res.json({ ok: true, partner: existing, already: true });

    const chain = await prisma.pharmacyChain.upsert({
      where: { name: data.chainName },
      update: {
        legalName: data.legalName ?? undefined,
        website: data.website ?? undefined,
        phone: data.phone ?? undefined,
      },
      create: {
        name: data.chainName,
        legalName: data.legalName ?? null,
        website: data.website ?? null,
        phone: data.phone ?? null,
      },
    });

    const org = await prisma.partnerOrg.create({
      data: {
        name: data.orgName,
        chainId: chain.id,
      },
    });

    const partnerUser = await prisma.partnerUser.create({
      data: {
        userId: req.user.id,
        orgId: org.id,
      },
      include: { org: { include: { chain: true } } },
    });

    res.json({ ok: true, partner: partnerUser });
  } catch (e) {
    next(e);
  }
});

partnersRouter.patch("/application", requireAuth, async (req, res, next) => {
  try {
    const data = applySchema.parse(req.body);

    const app = await prisma.partnerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_EDITABLE" });

    const updated = await prisma.partnerApplication.update({
      where: { userId: req.user.id },
      data: {
        orgName: data.orgName,
        chainName: data.chainName,
        legalName: data.legalName ?? null,
        website: data.website ?? null,
        phone: data.phone ?? null,
      },
    });

    res.json({ ok: true, application: updated });
  } catch (e) {
    next(e);
  }
});

partnersRouter.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const data = applySchema.parse(req.body);

    const alreadyPartner = await prisma.partnerUser.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (alreadyPartner) return res.status(400).json({ ok: false, error: "ALREADY_PARTNER" });

    const existing = await prisma.partnerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (existing?.status === "PENDING") {
      return res.status(400).json({ ok: false, error: "ALREADY_IN_PROCESS" });
    }

    const app = await prisma.partnerApplication.upsert({
      where: { userId: req.user.id },
      update: {
        orgName: data.orgName,
        chainName: data.chainName,
        legalName: data.legalName ?? null,
        website: data.website ?? null,
        phone: data.phone ?? null,
        status: "PENDING",
        decidedAt: null,
        decidedByUserId: null,
        rejectReason: null,
        chainId: null,
        orgId: null,
        partnerUserId: null,
      },
      create: {
        userId: req.user.id,
        orgName: data.orgName,
        chainName: data.chainName,
        legalName: data.legalName ?? null,
        website: data.website ?? null,
        phone: data.phone ?? null,
      },
    });

    res.json({ ok: true, application: app });
  } catch (e) {
    next(e);
  }
});

partnersRouter.get("/status", requireAuth, async (req, res, next) => {
  try {
    const partner = await prisma.partnerUser.findUnique({
      where: { userId: req.user.id },
      select: { id: true, createdAt: true, orgId: true },
    });

    if (partner) {
      return res.json({ ok: true, state: "PARTNER", partner });
    }

    const app = await prisma.partnerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (!app) return res.json({ ok: true, state: "NONE", application: null });

    if (app.status === "PENDING") return res.json({ ok: true, state: "IN_PROCESS", application: app });
    if (app.status === "REJECTED") return res.json({ ok: true, state: "REJECTED", application: app });
    if (app.status === "CANCELLED") return res.json({ ok: true, state: "NONE", application: app });

    // APPROVED но PartnerUser почему-то не создан (не должно быть)
    return res.json({ ok: true, state: "APPROVED", application: app });
  } catch (e) {
    next(e);
  }
});

partnersRouter.delete("/application", requireAuth, async (req, res, next) => {
  try {
    const app = await prisma.partnerApplication.findUnique({
      where: { userId: req.user.id },
    });

    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_CANCELLABLE" });

    const updated = await prisma.partnerApplication.update({
      where: { userId: req.user.id },
      data: { status: "CANCELLED" },
    });

    res.json({ ok: true, application: updated });
  } catch (e) {
    next(e);
  }
});

// ————— Partner pharmacies —————
async function requirePartner(req, res, next) {
  try {
    const partner = await prisma.partnerUser.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!partner) return res.status(403).json({ ok: false, error: "PARTNER_REQUIRED" });
    req.partnerUser = partner;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/partner/pharmacies
 * List pharmacies the current partner has access to (with rating aggregate).
 */
partnersRouter.get("/pharmacies", requireAuth, requirePartner, async (req, res, next) => {
  try {
    const list = await prisma.partnerUserPharmacyAccess.findMany({
      where: { partnerUserId: req.partnerUser.id },
      include: {
        pharmacy: {
          include: {
            address: true,
          },
        },
      },
    });
    const pharmacyIds = list.map((a) => a.pharmacy.id);
    let ratingByPharmacy = {};
    if (pharmacyIds.length > 0) {
      const stats = await prisma.pharmacyReview.groupBy({
        by: ["pharmacyId"],
        where: { pharmacyId: { in: pharmacyIds }, status: "PUBLISHED" },
        _avg: { rating: true },
        _count: true,
      });
      stats.forEach((s) => {
        ratingByPharmacy[s.pharmacyId] = {
          averageRating: s._avg.rating != null ? Math.round(s._avg.rating * 10) / 10 : null,
          reviewCount: s._count,
        };
      });
    }
    const pharmacies = list.map((a) => ({
      ...a.pharmacy,
      address: a.pharmacy.address,
      accessLevel: a.accessLevel,
      averageRating: ratingByPharmacy[a.pharmacy.id]?.averageRating ?? null,
      reviewCount: ratingByPharmacy[a.pharmacy.id]?.reviewCount ?? 0,
    }));
    res.json({ ok: true, pharmacies });
  } catch (e) {
    next(e);
  }
});

const paymentMethodEntrySchema = z.object({
  code: z.enum(["WHISH", "OMT", "CREDIT_CARD"]),
  payToIdentifier: z.string().max(50).optional().nullable(),
});

const uploadOrHttpUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v.length === 0 || v.startsWith("/") || /^https?:\/\//i.test(v),
    "Invalid image URL"
  );

const createPharmacySchema = z
  .object({
    name: z.string().min(1).max(200),
    logoUrl: uploadOrHttpUrlSchema.optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    website: z.string().url().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.object({
      raw: z.string().min(1).optional(),
      street: z.string().optional().nullable(),
      building: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      postalCode: z.string().optional().nullable(),
    }),
    paymentMethods: z.array(paymentMethodEntrySchema).optional().default([]),
  })
  .strict();

/**
 * POST /api/partner/pharmacies
 * Create a new pharmacy and link to current partner. Optionally add payment methods.
 */
partnersRouter.post("/pharmacies", requireAuth, requirePartner, async (req, res, next) => {
  try {
    const data = createPharmacySchema.parse(req.body);

    const address = await prisma.address.create({
      data: {
        raw: (data.address?.raw ?? [data.address?.street, data.address?.building, data.address?.city]
          .filter(Boolean)
          .join(", ")) || "Address",
        street: data.address?.street ?? null,
        building: data.address?.building ?? null,
        postalCode: data.address?.postalCode ?? null,
      },
    });

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl ?? null,
        addressId: address.id,
        phone: data.phone ?? null,
        website: data.website ?? null,
        email: data.email ?? null,
      },
      include: { address: true },
    });

    await prisma.partnerUserPharmacyAccess.create({
      data: {
        partnerUserId: req.partnerUser.id,
        pharmacyId: pharmacy.id,
        accessLevel: "OWNER",
      },
    });

    if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
      const activeMethods = await prisma.paymentMethod.findMany({
        where: { code: { in: data.paymentMethods.map((m) => m.code) }, isActive: true },
        select: { code: true },
      });
      const byCode = new Set(activeMethods.map((m) => m.code));
      for (let i = 0; i < data.paymentMethods.length; i++) {
        const pm = data.paymentMethods[i];
        if (!byCode.has(pm.code)) continue;
        await prisma.pharmacyPaymentMethod.create({
          data: {
            pharmacyId: pharmacy.id,
            methodCode: pm.code,
            currency: "LBP",
            isEnabled: true,
            payToIdentifier: pm.payToIdentifier ?? null,
            sortOrder: i,
          },
        });
      }
    }

    res.status(201).json({ ok: true, pharmacy });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ ok: false, error: "VALIDATION", details: e.errors });
    next(e);
  }
});

/**
 * GET /api/partner/pharmacies/:id
 * Get one pharmacy (must belong to current partner). Includes rating aggregate.
 */
partnersRouter.get("/pharmacies/:id", requireAuth, requirePartner, async (req, res, next) => {
  try {
    const access = await prisma.partnerUserPharmacyAccess.findFirst({
      where: {
        partnerUserId: req.partnerUser.id,
        pharmacyId: req.params.id,
      },
      include: {
        pharmacy: { include: { address: true } },
      },
    });
    if (!access) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const pharmacyId = access.pharmacy.id;
    const [stats] = await Promise.all([
      prisma.pharmacyReview.aggregate({
        where: { pharmacyId, status: "PUBLISHED" },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    const averageRating = stats._avg.rating != null ? Math.round(stats._avg.rating * 10) / 10 : null;
    const reviewCount = stats._count ?? 0;
    res.json({
      ok: true,
      pharmacy: {
        ...access.pharmacy,
        address: access.pharmacy.address,
        accessLevel: access.accessLevel,
        averageRating,
        reviewCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

const updatePharmacySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    logoUrl: uploadOrHttpUrlSchema.optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    website: z.string().url().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z
      .object({
        raw: z.string().optional(),
        street: z.string().optional().nullable(),
        building: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable(),
      })
      .optional(),
  })
  .strict();

/**
 * PATCH /api/partner/pharmacies/:id
 * Update pharmacy (owner only or any access).
 */
partnersRouter.patch("/pharmacies/:id", requireAuth, requirePartner, async (req, res, next) => {
  try {
    const access = await prisma.partnerUserPharmacyAccess.findFirst({
      where: {
        partnerUserId: req.partnerUser.id,
        pharmacyId: req.params.id,
      },
      include: { pharmacy: { include: { address: true } } },
    });
    if (!access) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const data = updatePharmacySchema.parse(req.body);
    const pharmacy = access.pharmacy;
    const addressId = pharmacy.addressId;

    if (data.address) {
      await prisma.address.update({
        where: { id: addressId },
        data: {
          raw: data.address.raw !== undefined ? (data.address.raw || null) : undefined,
          street: data.address.street !== undefined ? data.address.street : undefined,
          building: data.address.building !== undefined ? data.address.building : undefined,
          postalCode: data.address.postalCode !== undefined ? data.address.postalCode : undefined,
        },
      });
    }

    const updated = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.email !== undefined && { email: data.email }),
      },
      include: { address: true },
    });
    res.json({ ok: true, pharmacy: updated });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ ok: false, error: "VALIDATION", details: e.errors });
    next(e);
  }
});

/**
 * GET /api/partner/pharmacies/:pharmacyId/conversations
 * List conversations for this pharmacy. Query: tab=all|chat|reserved.
 * Each item: conversationId, user (name, email, phone), lastMessage, lastMessageAt, reservation (if any).
 */
partnersRouter.get("/pharmacies/:pharmacyId/conversations", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const tab = (req.query.tab || "all").toString().toLowerCase();
    const conversations = await prisma.pharmacyConversation.findMany({
      where: { pharmacyId: req.pharmacyId },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const reservationMap = new Map();
    const reservationList = await prisma.reservation.findMany({
      where: {
        pharmacyId: req.pharmacyId,
        status: { in: ["SUBMITTED", "CONFIRMED"] },
        userId: { in: conversations.map((c) => c.userId) },
      },
      include: {
        items: {
          include: {
            offer: {
              include: {
                sku: {
                  include: {
                    product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
                  },
                },
              },
            },
          },
        },
        payments: { include: { proofs: { where: { type: "SCREENSHOT" }, take: 1 } } },
      },
    });
    for (const r of reservationList) {
      reservationMap.set(r.userId, r);
    }
    let list = conversations.map((c) => {
      const reservation = reservationMap.get(c.userId);
      const payment = reservation?.payments?.[0];
      const proofUrl = payment?.proofs?.[0]?.value ?? null;
      return {
        id: c.id,
        userId: c.userId,
        userName: c.user?.name ?? "—",
        userEmail: c.user?.email ?? null,
        userPhone: c.user?.phone ?? null,
        lastMessage: c.messages[0]?.body ?? null,
        lastMessageAt: c.messages[0]?.createdAt ?? c.updatedAt,
        hasReservation: !!reservation,
        reservation: reservation
          ? {
              id: reservation.id,
              status: reservation.status,
              customerName: reservation.customerName ?? c.user?.name,
              customerPhone: reservation.customerPhone,
              totalBookingPrice: reservation.totalBookingPrice != null ? Number(reservation.totalBookingPrice) : null,
              currency: reservation.currency,
              submittedAt: reservation.submittedAt,
              items: reservation.items?.map((i) => ({
                productName: i.offer?.sku?.product?.translations?.[0]?.name ?? "—",
                quantity: i.quantity,
              })) ?? [],
              paymentProofUrl: proofUrl,
            }
          : null,
      };
    });
    if (tab === "chat") list = list.filter((x) => !x.hasReservation);
    else if (tab === "reserved") list = list.filter((x) => x.hasReservation);
    res.json({ ok: true, conversations: list });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/partner/pharmacies/:pharmacyId/conversations/:conversationId/messages
 * List messages (pharmacy partner only).
 */
partnersRouter.get("/pharmacies/:pharmacyId/conversations/:conversationId/messages", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const conv = await prisma.pharmacyConversation.findFirst({
      where: { id: req.params.conversationId, pharmacyId: req.pharmacyId },
    });
    if (!conv) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const messages = await prisma.pharmacyConversationMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true } } },
    });
    res.json({
      ok: true,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderUserId: m.senderUserId,
        senderName: m.sender?.name ?? "—",
        isFromPharmacy: m.senderUserId !== conv.userId,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/partner/pharmacies/:pharmacyId/conversations/:conversationId/messages
 * Send message as pharmacy (partner). Body: { body }.
 */
partnersRouter.post("/pharmacies/:pharmacyId/conversations/:conversationId/messages", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const body = (req.body?.body ?? "").toString().trim();
    if (!body) return res.status(400).json({ ok: false, error: "BODY_REQUIRED" });
    const conv = await prisma.pharmacyConversation.findFirst({
      where: { id: req.params.conversationId, pharmacyId: req.pharmacyId },
    });
    if (!conv) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const partnerUser = await prisma.partnerUser.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!partnerUser) return res.status(403).json({ ok: false, error: "PARTNER_REQUIRED" });
    const msg = await prisma.pharmacyConversationMessage.create({
      data: { conversationId: conv.id, senderUserId: req.user.id, body },
    });
    await prisma.pharmacyConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });
    res.status(201).json({ ok: true, message: { id: msg.id, body: msg.body, createdAt: msg.createdAt } });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/partner/pharmacies/:pharmacyId/reservations
 * List reservations for this pharmacy (SUBMITTED, CONFIRMED). With user info, items, payment proof.
 */
partnersRouter.get("/pharmacies/:pharmacyId/reservations", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        pharmacyId: req.pharmacyId,
        status: { in: ["SUBMITTED", "CONFIRMED"] },
      },
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            offer: { include: { sku: { include: { product: { include: { translations: { where: { locale: "EN" }, take: 1 } } } } } } },
          },
        },
        payments: {
          include: { proofs: { where: { type: "SCREENSHOT" }, take: 1 } },
        },
      },
    });
    const list = reservations.map((r) => {
      const payment = r.payments[0];
      const proofUrl = payment?.proofs?.[0]?.value ?? null;
      return {
        id: r.id,
        status: r.status,
        customerName: r.customerName ?? r.user?.name,
        customerEmail: r.user?.email ?? null,
        customerPhone: r.customerPhone,
        totalBookingPrice: r.totalBookingPrice != null ? Number(r.totalBookingPrice) : null,
        currency: r.currency,
        submittedAt: r.submittedAt,
        items: r.items.map((i) => ({
          id: i.id,
          productName: i.offer?.sku?.product?.translations?.[0]?.name ?? "—",
          quantity: i.quantity,
          unitBookingPrice: i.unitBookingPrice != null ? Number(i.unitBookingPrice) : null,
        })),
        paymentProofUrl: proofUrl,
      };
    });
    res.json({ ok: true, reservations: list });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/partner/pharmacies/:pharmacyId/reservations/:reservationId/confirm
 * Confirm a SUBMITTED reservation.
 */
partnersRouter.post("/pharmacies/:pharmacyId/reservations/:reservationId/confirm", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id: req.params.reservationId, pharmacyId: req.pharmacyId, status: "SUBMITTED" },
    });
    if (!reservation) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      prisma.reservationStatusEvent.create({
        data: { reservationId: reservation.id, status: "CONFIRMED", note: "Confirmed by pharmacy" },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/partner/pharmacies/:pharmacyId/reservations/:reservationId/reject
 * Reject a SUBMITTED reservation (body: { reason }).
 */
partnersRouter.post("/pharmacies/:pharmacyId/reservations/:reservationId/reject", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const reason = (req.body?.reason ?? "").toString().trim() || "Rejected by pharmacy";
    const reservation = await prisma.reservation.findFirst({
      where: { id: req.params.reservationId, pharmacyId: req.pharmacyId, status: "SUBMITTED" },
    });
    if (!reservation) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "REJECTED" },
      }),
      prisma.reservationStatusEvent.create({
        data: { reservationId: reservation.id, status: "REJECTED", note: reason },
      }),
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/partner/reviews
 * List all reviews left on partner's pharmacies (with pharmacy info). Paginated.
 * Query: limit (default 20), page (default 1).
 */
partnersRouter.get("/reviews", requireAuth, requirePartner, async (req, res, next) => {
  try {
    const accessList = await prisma.partnerUserPharmacyAccess.findMany({
      where: { partnerUserId: req.partnerUser.id },
      select: { pharmacyId: true },
    });
    const pharmacyIds = accessList.map((a) => a.pharmacyId);
    if (pharmacyIds.length === 0) {
      return res.json({ ok: true, reviews: [], total: 0, page: 1, limit: 20 });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [total, reviews] = await Promise.all([
      prisma.pharmacyReview.count({
        where: { pharmacyId: { in: pharmacyIds }, status: "PUBLISHED" },
      }),
      prisma.pharmacyReview.findMany({
        where: { pharmacyId: { in: pharmacyIds }, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
          pharmacy: { select: { id: true, name: true, address: { select: { raw: true } } } },
        },
      }),
    ]);

    const items = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      userName: r.user?.name ?? "User",
      pharmacyId: r.pharmacy?.id,
      pharmacyName: r.pharmacy?.name,
      pharmacyAddress: r.pharmacy?.address?.raw ?? null,
    }));
    res.json({ ok: true, reviews: items, total, page, limit });
  } catch (e) {
    next(e);
  }
});

// ————— Partner pharmacy products (offers) —————
async function requirePharmacyAccess(req, res, next) {
  try {
    const pharmacyId = req.params.pharmacyId || req.params.id;
    const access = await prisma.partnerUserPharmacyAccess.findFirst({
      where: { partnerUserId: req.partnerUser.id, pharmacyId },
      select: { pharmacyId: true },
    });
    if (!access) return res.status(403).json({ ok: false, error: "PHARMACY_ACCESS_DENIED" });
    req.pharmacyId = pharmacyId;
    next();
  } catch (e) {
    next(e);
  }
}

const createProductSchema = z
  .object({
    name: z.string().min(1).max(300),
    description: z.string().max(5000).optional().nullable(),
    imageUrl: z
      .string()
      .trim()
      .refine(
        (v) => v.length === 0 || v.startsWith("/") || /^https?:\/\//i.test(v),
        "Invalid image URL"
      )
      .optional()
      .nullable(),
    price: z.number().positive(),
    categoryId: z.string().min(1),
    currency: z.enum(["LBP", "USD"]).optional(),
    stockQty: z.number().int().min(1).optional().nullable(),
  })
  .strict();

/**
 * GET /api/partner/pharmacies/:pharmacyId/products
 * List products (offers) for this pharmacy.
 */
partnersRouter.get("/pharmacies/:pharmacyId/products", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { pharmacyId: req.pharmacyId, isDeleted: false },
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
    const items = offers.map((o) => ({
      id: o.id,
      name: o.sku?.product?.translations?.[0]?.name ?? "—",
      description: o.sku?.product?.translations?.[0]?.shortDescription ?? null,
      imageUrl: o.sku?.images?.[0]?.url ?? null,
      price: Number(o.bookingPrice),
      currency: o.currency,
      isFrozen: o.isFrozen,
      isDeleted: o.isDeleted,
      category: o.sku?.categories?.[0]?.category?.slug ?? null,
      stockQty: o.stockQty != null ? o.stockQty : null,
    }));
    res.json({ ok: true, products: items });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/partner/pharmacies/:pharmacyId/products
 * Create product + sku + offer for this pharmacy.
 */
partnersRouter.post("/pharmacies/:pharmacyId/products", requireAuth, requirePartner, requirePharmacyAccess, async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);
    const pharmacyId = req.pharmacyId;

    const category = await prisma.category.findFirst({ where: { id: data.categoryId, isActive: true } });
    if (!category) return res.status(400).json({ ok: false, error: "INVALID_CATEGORY" });

    const slugBase = data.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "product";
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const productSlug = `${slugBase}-${unique}`;
    const skuSlug = `sku-${unique}`;

    const product = await prisma.product.create({
      data: {
        slug: productSlug,
        translations: {
          create: {
            locale: "EN",
            name: data.name,
            shortDescription: data.description ?? null,
          },
        },
      },
    });

    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        slug: skuSlug,
        categories: { create: [{ categoryId: data.categoryId }] },
        images: data.imageUrl ? { create: [{ url: data.imageUrl, sortOrder: 0 }] } : undefined,
      },
    });

    const offer = await prisma.offer.create({
      data: {
        skuId: sku.id,
        pharmacyId,
        bookingPrice: data.price,
        currency: data.currency ?? "USD",
        ...(data.stockQty != null && { stockQty: data.stockQty }),
      },
      include: {
        sku: {
          include: {
            product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
            images: { take: 1 },
          },
        },
        pharmacy: true,
      },
    });

    res.status(201).json({
      ok: true,
      offer: {
        id: offer.id,
        name: offer.sku?.product?.translations?.[0]?.name,
        imageUrl: offer.sku?.images?.[0]?.url ?? null,
        price: Number(offer.bookingPrice),
        currency: offer.currency,
      },
    });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ ok: false, error: "VALIDATION", details: e.errors });
    next(e);
  }
});
