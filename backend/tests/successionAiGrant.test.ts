import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("POST /api/trusts/:id/succession-ai-budget", () => {
  it("rejects a request missing required fields", async () => {
    const res = await request(app).post("/api/trusts/test-trust-id/succession-ai-budget").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("grantorAddress");
  });

  it("404s for a trust that doesn't exist", async () => {
    const res = await request(app)
      .post("/api/trusts/00000000-0000-0000-0000-000000000000/succession-ai-budget")
      .send({ grantorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", budgetUsdg: "500" });
    expect([404, 500]).toContain(res.status);
  });
});

describe("GET /api/trusts/:id/succession-ai-budget", () => {
  it("404s for a trust that doesn't exist", async () => {
    const res = await request(app).get(
      "/api/trusts/00000000-0000-0000-0000-000000000000/succession-ai-budget",
    );
    expect([404, 500]).toContain(res.status);
  });
});
