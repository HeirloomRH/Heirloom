import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Mount routes
app.use("/health", healthRouter);

// Root informational endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "Heirloom API",
    status: "online",
    documentation: "/health",
  });
});
