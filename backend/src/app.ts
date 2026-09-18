import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { tokensRouter } from "./routes/tokens.js";
import { trustsRouter } from "./routes/trusts.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Health route
app.use("/health", healthRouter);

// Token catalog routes
app.use("/api/tokens", tokensRouter);
app.use("/tokens", tokensRouter);

// Trust lifecycle & vault routes
app.use("/api/trusts", trustsRouter);
app.use("/trusts", trustsRouter);

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
    endpoints: {
      health: "/health",
      tokens: "/api/tokens",
      trusts: "/api/trusts",
    },
  });
});
