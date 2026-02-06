import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const adminPartnerApplicationsRouter = Router();

adminPartnerApplicationsRouter.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/partner-applications?status=PENDING
 */
adminPartnerApplicationsRouter.get("/partner-applications", async (req, res, next) => {
  try {
    const status = (req.query.status || "PENDING").toString();

    const items = await prisma.partnerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, phone: true, name: true } },
        decidedBy: { select: { id: true, email: true, name: true } },
      },
      take: 200,
    });

    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

adminPartnerApplicationsRouter.post("/partner-applications/:id/approve", async (req, res, next) => {
  try {
    const id = req.params.id;

    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_PENDING" });

    const result = await prisma.$transaction(async (tx) => {
      // 1) создаём/апсертим chain
      const chain = await tx.pharmacyChain.upsert({
        where: { name: app.chainName },
        update: {
          legalName: app.legalName ?? undefined,
          website: app.website ?? undefined,
          phone: app.phone ?? undefined,
        },
        create: {
          name: app.chainName,
          legalName: app.legalName ?? null,
          website: app.website ?? null,
          phone: app.phone ?? null,
        },
      });

      // 2) org
      const org = await tx.partnerOrg.create({
        data: {
          name: app.orgName,
          chainId: chain.id,
        },
      });

      // 3) partner user (если уже создан — ошибка)
      const existingPartner = await tx.partnerUser.findUnique({
        where: { userId: app.userId },
        select: { id: true },
      });
      if (existingPartner) throw new Error("ALREADY_PARTNER");

      const partnerUser = await tx.partnerUser.create({
        data: {
          userId: app.userId,
          orgId: org.id,
        },
      });

      // 4) обновляем заявку
      const updatedApp = await tx.partnerApplication.update({
        where: { id: app.id },
        data: {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedByUserId: req.user.id,
          rejectReason: null,
          chainId: chain.id,
          orgId: org.id,
          partnerUserId: partnerUser.id,
        },
      });

      return { updatedApp, chain, org, partnerUser };
    });

    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

const rejectSchema = z.object({
  reason: z.string().min(2).max(500).optional().nullable(),
}).strict();

adminPartnerApplicationsRouter.post("/partner-applications/:id/reject", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { reason } = rejectSchema.parse(req.body);

    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_PENDING" });

    const updatedApp = await prisma.partnerApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedByUserId: req.user.id,
        rejectReason: reason ?? null,
      },
    });

    res.json({ ok: true, application: updatedApp });
  } catch (e) {
    next(e);
  }
});
