import { Router, Request, Response } from "express";
import { getRecentRequests, getRequestMetrics } from "../middleware/requestLogger.js";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    metrics: getRequestMetrics(),
  });
});

healthRouter.get("/requests", (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  res.status(200).json({
    count: getRecentRequests(limit).length,
    requests: getRecentRequests(limit),
  });
});

healthRouter.get("/metrics", (_req: Request, res: Response) => {
  res.status(200).json(getRequestMetrics());
});
