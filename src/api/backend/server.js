import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { pharmaciesRouter } from "./routes/pharmacies.js";
import { partnersRouter } from "./routes/partner.js";
import { adminRouter } from "./routes/admin.js";
import { catalogRouter } from "./routes/catalog.js";
import { offersRouter } from "./routes/offers.js";
import { reservationsRouter } from "./routes/reservations.js";
import { conversationsRouter } from "./routes/conversations.js";
import { bannersRouter } from "./routes/banners.js";
import { uploadRouter } from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/partner", partnersRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/admin", adminRouter);
app.use("/api", catalogRouter);
app.use("/api/offers", offersRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/banners", bannersRouter);
app.use("/api/upload", uploadRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || "INTERNAL_ERROR" });
});

app.listen(process.env.PORT || 4000, () => console.log("API up"));
