import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/requireAuth.js";

export const conversationsRouter = Router();

/**
 * GET /api/conversations
 * List current user's conversations (with pharmacy name and last message).
 */
conversationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const list = await prisma.pharmacyConversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        pharmacy: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const items = list.map((c) => ({
      id: c.id,
      pharmacyId: c.pharmacyId,
      pharmacyName: c.pharmacy?.name ?? "—",
      lastMessage: c.messages[0]?.body ?? null,
      lastMessageAt: c.messages[0]?.createdAt ?? c.updatedAt,
    }));
    res.json({ ok: true, conversations: items });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/conversations/:id
 * Get one conversation (must be participant). With pharmacy and last messages.
 */
conversationsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const conv = await prisma.pharmacyConversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { pharmacy: { select: { id: true, name: true, phone: true } } },
    });
    if (!conv) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    res.json({
      ok: true,
      conversation: {
        id: conv.id,
        pharmacyId: conv.pharmacyId,
        pharmacyName: conv.pharmacy?.name,
        pharmacyPhone: conv.pharmacy?.phone,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/conversations/:id/messages
 * List messages (must be participant).
 */
conversationsRouter.get("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const conv = await prisma.pharmacyConversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true },
    });
    if (!conv) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const messages = await prisma.pharmacyConversationMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true } } },
    });
    res.json({
      ok: true,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderUserId: m.senderUserId,
        senderName: m.sender?.name ?? "—",
        isMe: m.senderUserId === req.user.id,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/conversations/:id/messages
 * Send message (must be participant). Body: { body }.
 */
conversationsRouter.post("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const body = (req.body?.body ?? "").toString().trim();
    if (!body) return res.status(400).json({ ok: false, error: "BODY_REQUIRED" });
    const conv = await prisma.pharmacyConversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!conv) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const msg = await prisma.pharmacyConversationMessage.create({
      data: { conversationId: conv.id, senderUserId: req.user.id, body },
    });
    await prisma.pharmacyConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });
    res.status(201).json({ ok: true, message: { id: msg.id, body: msg.body, createdAt: msg.createdAt, isMe: true } });
  } catch (e) {
    next(e);
  }
});
