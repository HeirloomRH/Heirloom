import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/concierge/status", () => {
  it("should report configuration and liveness shape", async () => {
    const res = await request(app).get("/api/concierge/status");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("gatewayUrl");
    expect(res.body).toHaveProperty("studioAddress");
    expect(typeof res.body.isLive).toBe("boolean");
  });
});

describe("POST /api/concierge", () => {
  it("should reject a request with no messages", async () => {
    const res = await request(app).post("/api/concierge").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("messages");
  });

  it("should reject an empty messages array", async () => {
    const res = await request(app).post("/api/concierge").send({ messages: [] });

    expect(res.status).toBe(400);
  });

  it("should reject a message missing role or content", async () => {
    const res = await request(app)
      .post("/api/concierge")
      .send({ messages: [{ role: "user" }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("role and string content");
  });
});
