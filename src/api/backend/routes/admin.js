import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/dashboard
 * Cards for dashboard
 */

adminRouter.get("/me", (req, res) => {
  res.json({ ok: true, user: req.user });
});

adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const [pending, approved, rejected, cancelled] = await Promise.all([
      prisma.partnerApplication.count({ where: { status: "PENDING" } }),
      prisma.partnerApplication.count({ where: { status: "APPROVED" } }),
      prisma.partnerApplication.count({ where: { status: "REJECTED" } }),
      prisma.partnerApplication.count({ where: { status: "CANCELLED" } }),
    ]);

    const [users, pharmacies] = await Promise.all([
      prisma.user.count().catch(() => null),
      prisma.pharmacy.count().catch(() => null),
    ]);

    res.json({
      ok: true,
      cards: [
        { key: "pending", title: "Pending applications", value: pending },
        { key: "approved", title: "Approved applications", value: approved },
        { key: "rejected", title: "Rejected applications", value: rejected },
        { key: "cancelled", title: "Cancelled applications", value: cancelled },
        { key: "users", title: "Users", value: users ?? "—" },
        { key: "pharmacies", title: "Pharmacies", value: pharmacies ?? "—" },
      ],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/partner-applications?status=PENDING&limit=&offset=
 */
adminRouter.get("/partner-applications", async (req, res, next) => {
  try {
    const status = String(req.query.status || "PENDING");
    const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);

    const where = { status };

    const [items, total] = await Promise.all([
      prisma.partnerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, phone: true, name: true } },
          decidedBy: { select: { id: true, email: true, phone: true, name: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.partnerApplication.count({ where }),
    ]);

    res.json({ ok: true, items, total, limit, offset });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/partner-applications/:id/approve
 */
adminRouter.post("/partner-applications/:id/approve", async (req, res, next) => {
  try {
    const id = req.params.id;

    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_PENDING" });

    await prisma.$transaction(async (tx) => {
      // 1) create or reuse chain
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

      // 2) create org
      const org = await tx.partnerOrg.create({
        data: { name: app.orgName, chainId: chain.id },
      });

      // 3) create partner user (one per user)
      const exists = await tx.partnerUser.findUnique({
        where: { userId: app.userId },
        select: { id: true },
      });
      if (exists) throw new Error("ALREADY_PARTNER");

      const partnerUser = await tx.partnerUser.create({
        data: { userId: app.userId, orgId: org.id },
      });

      // 4) mark application approved
      await tx.partnerApplication.update({
        where: { id },
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
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/partner-applications/:id/reject
 * body: { reason?: string }
 */
adminRouter.post("/partner-applications/:id/reject", async (req, res, next) => {
  try {
    const id = req.params.id;
    const reason = (req.body?.reason || "").toString().trim() || "Rejected";

    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (app.status !== "PENDING") return res.status(400).json({ ok: false, error: "NOT_PENDING" });

    await prisma.partnerApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedByUserId: req.user.id,
        rejectReason: reason,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/recent-applications", async (req, res, next) => {
  try {
    const items = await prisma.partnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { id:true, email:true, phone:true, name:true } } },
    });
    res.json({ ok: true, items });
  } catch (e) { next(e); }
});