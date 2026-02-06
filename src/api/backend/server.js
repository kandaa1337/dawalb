import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { pharmaciesRouter } from "./routes/pharmacies.js";
import { partnersRouter } from "./routes/partner.js";
import { adminRouter } from "./routes/admin.js";


const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/partner", partnersRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/admin", adminRouter);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || "INTERNAL_ERROR" });
});

app.listen(process.env.PORT || 4000, () => console.log("API up"));
