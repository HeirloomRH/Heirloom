import express from "express";
import cors from "cors";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.js";
import { tokensRouter } from "./routes/tokens.js";
import { trustsRouter } from "./routes/trusts.js";
import { telegramRouter } from "./routes/telegram.js";
import { privacyRouter } from "./routes/privacy.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health route
app.use("/health", healthRouter);

// Token catalog routes
app.use("/api/tokens", tokensRouter);
app.use("/tokens", tokensRouter);

// Trust lifecycle & vault routes
app.use("/api/trusts", trustsRouter);
app.use("/trusts", trustsRouter);

// Privacy Expansion (H-0 & H-P) routes
app.use("/api", privacyRouter);
app.use("/", privacyRouter);

// Telegram Bot Webhook & Integration routes
app.use("/api/telegram", telegramRouter);
app.use("/telegram", telegramRouter);

// Root informational endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "Heirloom API",
    tagline: "The on-chain trust fund for tokenized stocks on Robinhood Chain",
    status: "online",
    network: {
      name: "Robinhood Chain",
      chainId: 4663,
    },
    privacy: {
      h0OnChainTrust: "live",
      hpShieldedPool: "active",
    },
    endpoints: {
      health: "/health",
      tokens: "/api/tokens",
      trusts: "/api/trusts",
      private: "/api/private",
      solvency: "/api/proofs/solvency",
      migration: "/api/migration/status",
    },
  });
});

