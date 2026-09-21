import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("Sealed Deposit & Relayer API", () => {
  it("GET /api/trusts/relayer-info should return relayer contract discovery info", async () => {
    const res = await request(app).get("/api/trusts/relayer-info");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.permit2Address).toBe("0x000000000022D473030F116dDEE9F6B43aC78BA3");
    expect(res.body.usdgAddress).toBe("0x5fc5360d0400a0fd4f2af552add042d716f1d168");
    expect(res.body.routerAddress).toBe("0xcaf681a66d020601342297493863e78c959e5cb2");
    expect(res.body.chainId).toBe(4663);
    expect(res.body.network).toBe("Robinhood Chain");
    expect(typeof res.body.isLive).toBe("boolean");
  });

  it("POST /api/trusts/:id/sealed-deposit should reject missing parameters", async () => {
    const res = await request(app)
      .post("/api/trusts/test-trust-id/sealed-deposit")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing required fields");
  });
});
