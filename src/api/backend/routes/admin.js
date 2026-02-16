import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const MANAGABLE_ROLES = ["ADMIN", "MODERATOR"];

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

    const [users, pharmacies, blockedPharmacies, blockedOffers] = await Promise.all([
      prisma.user.count().catch(() => null),
      prisma.pharmacy.count().catch(() => null),
      prisma.pharmacy.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: { id: true, name: true, updatedAt: true },
      }).catch(() => []),
      prisma.offer.findMany({
        where: { OR: [{ isFrozen: true }, { isDeleted: true }] },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          sku: {
            include: {
              product: { include: { translations: { where: { locale: "EN" }, take: 1 } } },
            },
          },
          pharmacy: { select: { id: true, name: true } },
        },
      }).catch(() => []),
    ]);
    res.json({
      ok: true,
      cards: [
        { key: "pending", title: "Pending applications", value: pending },
        { key: "approved", title: "Approved applications", value: approved },
        { key: "rejected", title: "Rejected applications", value: rejected },
        { key: "cancelled", title: "Cancelled applications", value: cancelled },
        { key: "users", title: "Users", value: users ?? "-" },
        { key: "pharmacies", title: "Pharmacies", value: pharmacies ?? "-" },
      ],
      blockedPharmacies: blockedPharmacies.map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
      })),
      blockedOffers: blockedOffers.map((o) => ({
        id: o.id,
        name: o.sku?.product?.translations?.[0]?.name ?? "-",
        pharmacyId: o.pharmacy?.id ?? null,
        pharmacyName: o.pharmacy?.name ?? "-",
        status: o.isDeleted ? "DELETED" : "FROZEN",
        reason: o.isDeleted ? o.deletedReason : o.frozenReason,
        updatedAt: o.updatedAt,
      })),
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

// ————— Super Admin: payment methods —————
/**
 * GET /api/admin/payment-methods
 * List all payment methods with isActive (super admin only).
 */
adminRouter.get("/payment-methods", requireSuperAdmin, async (req, res, next) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { code: "asc" },
    });
    res.json({ ok: true, items: methods.map((m) => ({ code: m.code, name: m.name, isActive: m.isActive })) });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/admin/payment-methods/:code
 * Body: { isActive: boolean }. Toggle payment method (super admin only).
 */
adminRouter.patch("/payment-methods/:code", requireSuperAdmin, async (req, res, next) => {
  try {
    const code = (req.params.code || "").toString().toUpperCase();
    const isActive = Boolean(req.body?.isActive);
    const method = await prisma.paymentMethod.findUnique({ where: { code } });
    if (!method) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await prisma.paymentMethod.update({
      where: { code },
      data: { isActive },
    });
    res.json({ ok: true, code, isActive });
  } catch (e) {
    next(e);
  }
});

// ————— Super Admin: users & roles —————
/**
 * GET /api/admin/users?q=&limit=50&offset=0
 * List users with roles (super admin only).
 */
adminRouter.get("/users", requireSuperAdmin, async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);

    const where = {};
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          createdAt: true,
          roles: { include: { role: { select: { code: true, name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      createdAt: u.createdAt,
      roles: (u.roles || []).map((r) => r.role?.code).filter(Boolean),
    }));

    res.json({ ok: true, items, total, limit, offset });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/users/:userId/roles
 * Body: { role: "ADMIN" | "MODERATOR" }
 */
adminRouter.post("/users/:userId/roles", requireSuperAdmin, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const roleCode = (req.body?.role || "").toString().toUpperCase();
    if (!MANAGABLE_ROLES.includes(roleCode)) {
      return res.status(400).json({ ok: false, error: "INVALID_ROLE", allowed: MANAGABLE_ROLES });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

    const role = await prisma.role.findUnique({ where: { code: roleCode }, select: { id: true } });
    if (!role) return res.status(400).json({ ok: false, error: "ROLE_NOT_FOUND" });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });

    res.json({ ok: true, role: roleCode });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/users/:userId/roles/:roleCode
 */
adminRouter.delete("/users/:userId/roles/:roleCode", requireSuperAdmin, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const roleCode = (req.params.roleCode || "").toString().toUpperCase();
    if (!MANAGABLE_ROLES.includes(roleCode)) {
      return res.status(400).json({ ok: false, error: "INVALID_ROLE", allowed: MANAGABLE_ROLES });
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode }, select: { id: true } });
    if (!role) return res.status(400).json({ ok: false, error: "ROLE_NOT_FOUND" });

    await prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/pharmacies/:id/block
 * Admin: block pharmacy (isActive = false), hide from site. Notify pharmacy partners.
 */
adminRouter.post("/pharmacies/:id/block", async (req, res, next) => {
  try {
    const pharmacyId = req.params.id;
    const reason = (req.body?.reason ?? "").toString().trim();
    if (!reason) return res.status(400).json({ ok: false, error: "REASON_REQUIRED" });
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { access: { include: { partnerUser: { select: { userId: true } } } } },
    });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    await prisma.$transaction(async (tx) => {
      await tx.pharmacy.update({
        where: { id: pharmacyId },
        data: { isActive: false },
      });
      const userIds = [...new Set(pharmacy.access.map((a) => a.partnerUser.userId))];
      for (const userId of userIds) {
        await tx.notification.create({
          data: {
            userId,
            type: "PHARMACY_BLOCKED",
            title: "Аптека заблокирована",
            body: `Аптека скрыта с площадки. Причина: ${reason}. Все товары этой аптеки скрыты.`,
            refId: pharmacyId,
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
 * POST /api/admin/pharmacies/:id/unblock
 */
adminRouter.post("/pharmacies/:id/unblock", async (req, res, next) => {
  try {
    const pharmacyId = req.params.id;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: { isActive: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});


