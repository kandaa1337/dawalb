import { Router } from "express";
export const apiRouter = Router();

apiRouter.get("/v1/ping", (req, res) => res.json({ pong: true }));