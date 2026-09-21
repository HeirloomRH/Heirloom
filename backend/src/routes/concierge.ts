import { Router, Request, Response } from "express";
import {
  askConcierge,
  getConciergeStatus,
  type ConciergeMessage,
} from "../services/conciergeService.js";

export const conciergeRouter = Router();

/**
 * GET /api/concierge/status
 * Whether the studio's Orbio-funded concierge is configured on this node.
 */
conciergeRouter.get("/status", (_req: Request, res: Response) => {
  res.json(getConciergeStatus());
});

/**
 * POST /api/concierge
 * Ask Heirloom's setup/heartbeat/beneficiary concierge a question. Runs on
 * Orbio inference paid for with studio-held CREDIT — never a grantor's or
 * beneficiary's own funds.
 */
conciergeRouter.post("/", async (req: Request, res: Response) => {
  try {
    const messages = req.body?.messages as ConciergeMessage[] | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Missing required field: messages (non-empty array)" });
      return;
    }
    if (messages.some((m) => !m?.role || typeof m.content !== "string")) {
      res.status(400).json({ error: "Each message needs a role and string content" });
      return;
    }

    const model = typeof req.body?.model === "string" ? req.body.model : undefined;
    const result = await askConcierge({ messages, model });
    res.json({ reply: result.reply });
  } catch (err) {
    console.error("Error calling concierge:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Concierge request failed", details: message });
  }
});
