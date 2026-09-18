import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /health", () => {
  it("should return 200 with status ok and valid ISO timestamp", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe("ok");
    expect(res.body.version).toBe("1.0.0");
    expect(typeof res.body.timestamp).toBe("string");

    // Verify it is a valid ISO timestamp
    const parsedDate = new Date(res.body.timestamp);
    expect(Number.isNaN(parsedDate.getTime())).toBe(false);
    expect(parsedDate.toISOString()).toBe(res.body.timestamp);
  });
});
