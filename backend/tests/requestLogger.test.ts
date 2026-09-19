import { describe, it, expect, beforeEach } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";
import {
  clearRequestHistory,
  getRecentRequests,
  getRequestMetrics,
} from "../src/middleware/requestLogger.js";

describe("Request Logger Middleware & Metrics", () => {
  beforeEach(() => {
    clearRequestHistory();
  });

  it("should assign and return X-Request-Id header on all requests", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    const reqId = res.headers["x-request-id"];
    expect(reqId).toBeDefined();
    expect(typeof reqId).toBe("string");
    expect(reqId.length).toBeGreaterThan(0);
  });

  it("should preserve custom incoming X-Request-Id header", async () => {
    const customId = "trace-custom-uuid-12345";
    const res = await request(app)
      .get("/health")
      .set("x-request-id", customId);

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe(customId);
  });

  it("should record requests in history and track metrics", async () => {
    await request(app).get("/health");
    await request(app).get("/api/tokens");

    const history = getRecentRequests();
    expect(history.length).toBe(2);

    const metrics = getRequestMetrics();
    expect(metrics.totalRequests).toBe(2);
    expect(metrics.status2xx).toBe(2);
    expect(metrics.avgDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("GET /health/requests should return recent request history", async () => {
    await request(app).get("/");
    await request(app).get("/health");

    const res = await request(app).get("/health/requests");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.requests)).toBe(true);

    const firstEntry = res.body.requests[0];
    expect(firstEntry.id).toBeDefined();
    expect(firstEntry.method).toBeDefined();
    expect(firstEntry.status).toBe(200);
  });

  it("GET /health/metrics should return aggregate status code counters", async () => {
    await request(app).get("/health");
    await request(app).get("/non-existent-endpoint-404");

    const res = await request(app).get("/health/metrics");
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBeGreaterThanOrEqual(2);
    expect(res.body.status2xx).toBeGreaterThanOrEqual(1);
    expect(res.body.status4xx).toBeGreaterThanOrEqual(1);
  });
});
