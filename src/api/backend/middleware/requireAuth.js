import { findSession } from "../services/auth.js";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sid";

export async function requireAuth(req, res, next) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    const session = await findSession(token);
    if (!session) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    req.session = session;
    req.user = session.user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Sets req.user if session exists; does not 401. */
export async function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);
    const session = await findSession(token);
    if (session) {
      req.session = session;
      req.user = session.user;
    } else {
      req.user = null;
    }
    next();
  } catch (e) {
    next(e);
  }
}
