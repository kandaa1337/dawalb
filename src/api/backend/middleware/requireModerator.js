export function requireModerator(req, res, next) {
  const user = req.user;
  if (!user) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const roleCodes = (user.roles || []).map((r) => r?.role?.code).filter(Boolean);
  const isModerator = roleCodes.includes("MODERATOR");
  const isAdmin = roleCodes.includes("ADMIN");
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const superEmails = (process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const byEmail = user.email && (adminEmails.includes(user.email.toLowerCase()) || superEmails.includes(user.email.toLowerCase()));

  if (isModerator || isAdmin || byEmail) return next();
  return res.status(403).json({ ok: false, error: "FORBIDDEN" });
}
