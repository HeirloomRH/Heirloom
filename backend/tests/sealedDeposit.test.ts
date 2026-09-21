import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";
import { computeMinCreditOut } from "../src/services/sealedDepositService.js";

describe("Sealed Deposit & Relayer API", () => {
  it("GET /api/trusts/relayer-info should return relayer contract discovery info", async () => {
    const res = await request(app).get("/api/trusts/relayer-info");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.permit2Address).toBe("0x000000000022D473030F116dDEE9F6B43aC78BA3");
    expect(res.body.usdgAddress).toBe("0x5fc5360d0400a0fd4f2af552add042d716f1d168");
    expect(res.body.routerAddress).toBe("0xcaf681a66d020601342297493863e78c959e5cb2");
    expect(res.body.creditAddress).toBe("0xe33322da1380e61e5ae5dfb21e7f62924c73004c");
    expect(res.body.orbioExchangeAddress).toBe("0x6951ffd32630b05e06f50062aea801625a58ebc0");
    expect(res.body.chainId).toBe(4663);
    expect(res.body.network).toBe("Robinhood Chain");
    expect(typeof res.body.isLive).toBe("boolean");
  });

  it("POST /api/trusts/:id/sealed-deposit should reject missing parameters", async () => {
    const res = await request(app).post("/api/trusts/test-trust-id/sealed-deposit").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing required fields");
  });
});

describe("computeMinCreditOut (Orbio CREDIT peg-band enforcement)", () => {
  it("never accepts a floor worse than $1.00 + tolerance per CREDIT", () => {
    // 200 bps = 2% tolerance: 1,000,000 USDG must buy at least ~980,392 CREDIT.
    const floor = computeMinCreditOut(1_000_000n, 0n, 200);
    expect(floor).toBe(980_392n);
  });

  it("widens to the caller's slippage-based minOut when that is stricter", () => {
    const requestedMinOut = 995_000n; // tighter than the 2% peg-tolerance floor
    const floor = computeMinCreditOut(1_000_000n, requestedMinOut, 200);
    expect(floor).toBe(requestedMinOut);
  });

  it("zero tolerance enforces an exact 1:1 peg", () => {
    const floor = computeMinCreditOut(500_000n, 0n, 0);
    expect(floor).toBe(500_000n);
  });
});

describe("GET /api/concierge/status", () => {
  it("reports whether the studio's Orbio concierge is configured", async () => {
    const res = await request(app).get("/api/concierge/status");

    expect(res.status).toBe(200);
    expect(typeof res.body.isLive).toBe("boolean");
    expect(res.body.gatewayUrl).toBe("https://www.orbio.so/api/v1");
  });
});

describe("POST /api/concierge", () => {
  it("rejects a request with no messages", async () => {
    const res = await request(app).post("/api/concierge").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("messages");
  });

  it("rejects a message missing role or content", async () => {
    const res = await request(app)
      .post("/api/concierge")
      .send({ messages: [{ role: "user" }] });

    expect(res.status).toBe(400);
  });
});
