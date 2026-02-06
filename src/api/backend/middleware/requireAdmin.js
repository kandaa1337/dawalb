export function requireAdmin(req, res, next) {
  // requireAuth должен уже поставить req.user
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const ok = req.user?.email && emails.includes(req.user.email.toLowerCase());
  if (!ok) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  next();
}
