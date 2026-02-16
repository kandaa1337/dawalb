/**
 * Только суперадмины (SUPER_ADMIN_EMAILS или ADMIN_EMAILS) могут управлять ролями.
 */
export function requireSuperAdmin(req, res, next) {
  const raw =
    process.env.SUPER_ADMIN_EMAILS ||
    process.env.ADMIN_EMAILS ||
    process.env.ADMIN_EMAIL ||
    "";
  const emails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const ok = req.user?.email && emails.includes(req.user.email.toLowerCase());
  if (!ok) return res.status(403).json({ ok: false, error: "FORBIDDEN_SUPER_ADMIN" });

  next();
}
