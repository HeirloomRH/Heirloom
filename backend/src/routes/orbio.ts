import { Router, Request, Response } from "express";
import { parseUnits } from "viem";
import { query } from "../db/index.js";
import {
  publicClient,
  orbioExchangeAbi,
  ORBIO_EXCHANGE_ADDRESS,
} from "../services/sealedDepositService.js";

export const orbioRouter = Router();

/**
 * GET /api/orbio/quote?usdgIn=100
 * Live CREDIT quote for a given USDG amount, logged to orbio_quotes for the
 * audit trail the doc's orbio-quote-watcher pattern expects.
 */
orbioRouter.get("/quote", async (req: Request, res: Response) => {
  try {
    const usdgInParam = req.query.usdgIn as string | undefined;
    if (!usdgInParam) {
      res.status(400).json({ error: "usdgIn query parameter is required" });
      return;
    }
    const usdgIn = parseUnits(usdgInParam, 6);
    if (usdgIn <= 0n) {
      res.status(400).json({ error: "usdgIn must be greater than 0" });
      return;
    }
    const maxFills = 10n;

    const creditOut = await publicClient.readContract({
      address: ORBIO_EXCHANGE_ADDRESS,
      abi: orbioExchangeAbi,
      functionName: "getQuote",
      args: [usdgIn, maxFills],
    });

    // Discount vs. the $1.00 peg: creditOut/usdgIn > 1 means CREDIT is cheap.
    const discountBps = Number(((creditOut - usdgIn) * 10000n) / usdgIn);

    await query(
      `INSERT INTO orbio_quotes (usdg_in_atomic, credit_out_atomic, discount_bps) VALUES ($1, $2, $3)`,
      [usdgIn.toString(), creditOut.toString(), discountBps],
    );

    res.json({
      usdgIn: usdgIn.toString(),
      creditOut: creditOut.toString(),
      discountBps,
    });
  } catch (err) {
    console.error("Error fetching Orbio quote:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch Orbio quote", details: message });
  }
});
