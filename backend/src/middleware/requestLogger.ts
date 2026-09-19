import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface RequestLogEntry {
  id: string;
  method: string;
  url: string;
  path: string;
  status: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface RequestMetrics {
  totalRequests: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  avgDurationMs: number;
  lastRequestAt?: string;
}

// In-memory ring buffer of recent requests (last 100)
const MAX_LOG_BUFFER = 100;
const requestHistory: RequestLogEntry[] = [];
const metrics: RequestMetrics = {
  totalRequests: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  avgDurationMs: 0,
};

let totalDurationSum = 0;

export function getRecentRequests(limit = 50): RequestLogEntry[] {
  return requestHistory.slice(-Math.min(limit, MAX_LOG_BUFFER));
}

export function getRequestMetrics(): RequestMetrics {
  return { ...metrics };
}

export function clearRequestHistory(): void {
  requestHistory.length = 0;
  metrics.totalRequests = 0;
  metrics.status2xx = 0;
  metrics.status3xx = 0;
  metrics.status4xx = 0;
  metrics.status5xx = 0;
  metrics.avgDurationMs = 0;
  totalDurationSum = 0;
  delete metrics.lastRequestAt;
}

/**
 * Express middleware for request tracing, performance measurement,
 * structured logging, and health telemetry.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  // Extract or generate a correlation Request ID
  const existingId = req.header("x-request-id");
  const requestId = existingId || crypto.randomUUID();

  // Attach to request object and response header
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);

  // Extract client IP and user agent safely
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(",")[0].trim();
  const userAgent = req.header("user-agent") || "unknown";

  // Hook into response completion
  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1_000_000n);

    // Set X-Response-Time header if headers aren't sent (though finish is triggered after send)
    const status = res.statusCode;

    // Update aggregate metrics
    metrics.totalRequests += 1;
    metrics.lastRequestAt = timestamp;
    totalDurationSum += durationMs;
    metrics.avgDurationMs = Math.round((totalDurationSum / metrics.totalRequests) * 100) / 100;

    if (status >= 500) metrics.status5xx += 1;
    else if (status >= 400) metrics.status4xx += 1;
    else if (status >= 300) metrics.status3xx += 1;
    else metrics.status2xx += 1;

    const entry: RequestLogEntry = {
      id: requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      status,
      durationMs,
      ip,
      userAgent,
      timestamp,
    };

    // Store in ring buffer
    if (requestHistory.length >= MAX_LOG_BUFFER) {
      requestHistory.shift();
    }
    requestHistory.push(entry);

    // Format console output
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      // Structured JSON log for production aggregators
      const logPayload = {
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        type: "http_request",
        ...entry,
      };
      console.log(JSON.stringify(logPayload));
    } else {
      // Human-readable dev format
      const color =
        status >= 500
          ? "\x1b[31m" // red
          : status >= 400
          ? "\x1b[33m" // yellow
          : status >= 300
          ? "\x1b[36m" // cyan
          : "\x1b[32m"; // green
      const reset = "\x1b[0m";

      console.log(
        `[HTTP] ${color}${req.method.padEnd(6)}${reset} ${entry.url} ${color}${status}${reset} in ${durationMs}ms (req: ${requestId.slice(0, 8)})`
      );
    }
  });

  next();
}
