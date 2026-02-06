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