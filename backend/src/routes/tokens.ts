import { Router, Request, Response } from "express";
import {
  getAllRobinhoodTokens,
  resolveRobinhoodToken,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
} from "../lib/robinhoodTokens.js";

export const tokensRouter = Router();

/**
 * GET /api/tokens
 * Returns catalog of verified tokenized stocks, ETFs, and stablecoins on Robinhood Chain
 */
tokensRouter.get("/", (_req: Request, res: Response) => {
  const tokens = getAllRobinhoodTokens();
  res.json({
    chainId: ROBINHOOD_CHAIN_ID,
    explorerUrl: ROBINHOOD_EXPLORER_URL,
    count: tokens.length,
    tokens,
  });
});

/**
 * GET /api/tokens/resolve
 * Resolve a token by symbol, name, or contract address
 */
tokensRouter.get("/resolve", (req: Request, res: Response) => {
  const query = req.query.query as string;
  if (!query) {
    res.status(400).json({ error: "Missing 'query' parameter" });
    return;
  }

  const token = resolveRobinhoodToken(query);
  if (!token) {
    res.status(404).json({ error: `Token not found for query: ${query}` });
    return;
  }

  res.json({ token });
});
