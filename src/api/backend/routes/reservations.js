import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const reservationsRouter = Router();

const createReservationSchema = z
  .object({
    offerId: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    paymentMethodCode: z.enum(["WHISH", "OMT", "CREDIT_CARD"]),
    paymentProofUrl: z.string().url().optional().nullable(),
    customerPhone: z.string().min(1).optional(),
  })
  .strict();

/**
 * POST /api/reservations
 * Create a reservation (SUBMITTED) with payment. User must be logged in.
 * Reserve amount = offer.bookingPrice / 10 * quantity.
 */
reservationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const parse = createReservationSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ ok: false, error: "VALIDATION", details: parse.error.errors });
    }
    const { offerId, quantity, paymentMethodCode, paymentProofUrl, customerPhone } = parse.data;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        sku: { select: { id: true } },
        pharmacy: { select: { id: true } },
      },
    });
    if (!offer || offer.isDeleted || offer.isFrozen) {
      return res.status(404).json({ ok: false, error: "OFFER_NOT_FOUND" });
    }

    const pm = await prisma.pharmacyPaymentMethod.findFirst({
      where: {
        pharmacyId: offer.pharmacyId,
        methodCode: paymentMethodCode,
        isEnabled: true,
      },
      include: { method: { select: { isActive: true } } },
    });
    if (!pm || !pm.method?.isActive) {
      return res.status(400).json({ ok: false, error: "PAYMENT_METHOD_NOT_AVAILABLE" });
    }

    if (offer.stockQty != null && quantity > offer.stockQty) {
      return res.status(400).json({ ok: false, error: "QUANTITY_EXCEEDS_STOCK", stockQty: offer.stockQty });
    }
    const bookingPrice = Number(offer.bookingPrice);
    const reserveAmount = (bookingPrice / 10) * quantity;
    const currency = offer.currency;
    const phone = (customerPhone || req.user?.phone || "").toString().trim();
    if (!phone) return res.status(400).json({ ok: false, error: "PHONE_REQUIRED" });

    const paymentUrl =
      pm.payToIdentifier ?
        `Send ${reserveAmount} ${currency} to ${pm.payToIdentifier}`
      : `Pay ${reserveAmount} ${currency} (${paymentMethodCode})`;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          userId: req.user.id,
          pharmacyId: offer.pharmacyId,
          status: "SUBMITTED",
          customerName: req.user.name ?? null,
          customerPhone: phone,
          currency,
          totalBookingPrice: reserveAmount,
          submittedAt: new Date(),
        },
      });

      await tx.reservationItem.create({
        data: {
          reservationId: reservation.id,
          skuId: offer.skuId,
          offerId: offer.id,
          quantity,
          unitBookingPrice: bookingPrice / 10,
        },
      });

      const payment = await tx.reservationPayment.create({
        data: {
          reservationId: reservation.id,
          userId: req.user.id,
          provider: paymentMethodCode,
          amount: reserveAmount,
          currency,
          status: paymentProofUrl ? "USER_REPORTED_PAID" : "AWAITING_PAYMENT",
          paymentUrl,
          userReportedPaidAt: paymentProofUrl ? new Date() : null,
        },
      });

      if (paymentProofUrl) {
        await tx.paymentProof.create({
          data: {
            paymentId: payment.id,
            type: "SCREENSHOT",
            value: paymentProofUrl,
            createdByUserId: req.user.id,
          },
        });
      }

      await tx.reservationStatusEvent.create({
        data: { reservationId: reservation.id, status: "SUBMITTED", note: "Created with payment" },
      });

      return { reservation, payment };
    });

    const ownerUserIds = await prisma.partnerUserPharmacyAccess.findMany({
      where: { pharmacyId: offer.pharmacyId },
      select: { partnerUser: { select: { userId: true } } },
    });
    const userIds = [...new Set(ownerUserIds.map((a) => a.partnerUser.userId))];
    const title = "New reservation";
    const body = `Reservation for ${quantity} item(s), ${reserveAmount} ${currency}. Payment: ${paymentMethodCode}.`;
    for (const userId of userIds) {
      await prisma.notification.create({
        data: { userId, type: "RESERVATION_SUBMITTED", title, body, refId: result.reservation.id },
      });
    }
    let conv = await prisma.pharmacyConversation.findUnique({
      where: { pharmacyId_userId: { pharmacyId: offer.pharmacyId, userId: req.user.id } },
    });
    if (!conv) {
      await prisma.pharmacyConversation.create({
        data: { pharmacyId: offer.pharmacyId, userId: req.user.id },
      });
    }

    res.status(201).json({
      ok: true,
      reservation: {
        id: result.reservation.id,
        status: result.reservation.status,
        totalBookingPrice: Number(result.reservation.totalBookingPrice),
        currency: result.reservation.currency,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/reservations
 * List reservations for current user with items and payment info.
 */
reservationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const list = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        pharmacy: { select: { id: true, name: true } },
        items: {
          include: {
            offer: {
              select: {
                id: true,
                bookingPrice: true,
                currency: true,
                sku: {
                  include: {
                    product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                  },
                },
              },
            },
            sku: {
              include: {
                product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
          },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const reservations = list.map((r) => {
      const items = (r.items || []).map((it) => {
        const name =
          it.offer?.sku?.product?.translations?.[0]?.name ??
          it.sku?.product?.translations?.[0]?.name ??
          "Item";
        const imageUrl =
          it.offer?.sku?.images?.[0]?.url ??
          it.sku?.images?.[0]?.url ??
          null;
        return {
          offerId: it.offerId,
          productName: name,
          imageUrl,
          quantity: it.quantity,
          unitBookingPrice: it.unitBookingPrice != null ? Number(it.unitBookingPrice) : null,
        };
      });

      const payment = r.payments?.[0] ?? null;
      return {
        id: r.id,
        status: r.status,
        pharmacyId: r.pharmacyId,
        pharmacyName: r.pharmacy?.name ?? "",
        currency: r.currency,
        totalBookingPrice: r.totalBookingPrice != null ? Number(r.totalBookingPrice) : 0,
        submittedAt: r.submittedAt,
        createdAt: r.createdAt,
        items,
        paymentProvider: payment?.provider ?? null,
        paymentStatus: payment?.status ?? null,
        paymentAmount: payment?.amount != null ? Number(payment.amount) : null,
      };
    });

    res.json({ ok: true, reservations });
  } catch (e) {
    next(e);
  }
});
