export function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const adminEmails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const superRaw =
    process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const superEmails = superRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const byAdminEmail = user.email && adminEmails.includes(user.email.toLowerCase());
  const bySuperEmail = user.email && superEmails.includes(user.email.toLowerCase());
  const roleCodes = (user.roles || []).map((r) => r?.role?.code).filter(Boolean);
  const byRole = roleCodes.includes("ADMIN");

  if (byAdminEmail || bySuperEmail || byRole) return next();
  return res.status(403).json({ ok: false, error: "FORBIDDEN" });
}
