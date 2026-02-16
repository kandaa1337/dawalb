import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { requireAuth } from "../middleware/requireAuth.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Корневая папка uploads; баннеры и fallback-папки для обратной совместимости
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(UPLOADS_DIR);
ensureDir(path.join(UPLOADS_DIR, "banners"));
ensureDir(path.join(UPLOADS_DIR, "products"));
ensureDir(path.join(UPLOADS_DIR, "payments"));

/**
 * Определяем папку по type и pharmacyId.
 * - banner → uploads/banners/
 * - product + pharmacyId → uploads/pharmacies/:id/products/
 * - pharmacy_logo + pharmacyId → uploads/pharmacies/:id/
 * - payment + pharmacyId → uploads/pharmacies/:id/payments/
 * Без pharmacyId для product/payment/pharmacy_logo — fallback в общие папки (обратная совместимость).
 */
function getUploadSubdir(type, pharmacyId) {
  const t = (type || "").toString().toLowerCase();
  const id = (pharmacyId || "").toString().trim();
  if (t === "banner") return "banners";
  if (id) {
    if (t === "product") return path.join("pharmacies", id, "products");
    if (t === "pharmacy_logo") return path.join("pharmacies", id);
    if (t === "payment") return path.join("pharmacies", id, "payments");
  }
  // fallback для старых запросов без pharmacyId
  if (t === "payment") return "payments";
  return "products";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const t = req.body?.type;
    const pharmacyId = req.body?.pharmacyId;
    const sub = getUploadSubdir(t, pharmacyId);
    const dir = path.join(UPLOADS_DIR, sub);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || ".jpg";
    const t = (req.body?.type || "").toString().toLowerCase();
    const prefix = t === "pharmacy_logo" ? "logo" : "img";
    const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("INVALID_IMAGE_TYPE"));
  },
});

export const uploadRouter = Router();

/**
 * POST /api/upload/image
 * FormData: file (image), type = "banner" | "product" | "pharmacy_logo" | "payment", pharmacyId (обязателен для product/pharmacy_logo/payment).
 * Сохранение:
 *   - banner → uploads/banners/
 *   - product → uploads/pharmacies/:pharmacyId/products/
 *   - pharmacy_logo → uploads/pharmacies/:pharmacyId/
 *   - payment → uploads/pharmacies/:pharmacyId/payments/
 * Returns { url: "/api/uploads/..." }
 */
uploadRouter.post("/image", requireAuth, upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "FILE_REQUIRED" });
    const relPath = path.relative(UPLOADS_DIR, req.file.path);
    const url = `/api/uploads/${relPath.replace(/\\/g, "/")}`;
    res.json({ ok: true, url });
  } catch (e) {
    next(e);
  }
});
