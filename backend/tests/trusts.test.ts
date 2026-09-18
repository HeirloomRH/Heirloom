import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("Trusts API Integration", () => {
  let createdTrustId: string;
  let vaultAddress: string;

  const testGrantor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const testBeneficiary = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  it("POST /api/trusts should create a trust and assign an isolated vault address", async () => {
    const payload = {
      name: "Sophia's Generational Trust",
      grantorAddress: testGrantor,
      beneficiaryAddress: testBeneficiary,
      isRevocable: true,
      heartbeatWindowSeconds: 2592000,
      letterToBeneficiary: "Dearest Sophia, this trust was built for your future education and financial freedom.",
      assets: [
        { symbol: "SPCX", targetAllocationBps: 5000 },
        { symbol: "USDG", targetAllocationBps: 5000 },
      ],
      vestingSchedules: [
        { unlockTimestamp: "2030-01-01T00:00:00Z", percentageBps: 5000 },
        { unlockTimestamp: "2035-01-01T00:00:00Z", percentageBps: 5000 },
      ],
      guardians: [
        { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", role: "family_guardian" },
      ],
    };

    const res = await request(app).post("/api/trusts").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.trust).toBeDefined();
    expect(res.body.trust.name).toBe("Sophia's Generational Trust");
    expect(res.body.trust.vaultAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(res.body.trust.vaultIndex).toBeGreaterThanOrEqual(1);
    expect(res.body.fundingInstructions).toBeDefined();
    expect(res.body.fundingInstructions.depositAddress).toBe(res.body.trust.vaultAddress);

    createdTrustId = res.body.trust.id;
    vaultAddress = res.body.trust.vaultAddress;
  }, 20000);

  it("GET /api/trusts/:id should return trust data and live vault balances", async () => {
    const res = await request(app).get(`/api/trusts/${createdTrustId}`);

    expect(res.status).toBe(200);
    expect(res.body.trust.id).toBe(createdTrustId);
    expect(res.body.trust.name).toBe("Sophia's Generational Trust");
    expect(res.body.trust.vaultAddress).toBe(vaultAddress);
    expect(Array.isArray(res.body.assets)).toBe(true);
    expect(Array.isArray(res.body.vestingSchedules)).toBe(true);
    expect(Array.isArray(res.body.liveBalances)).toBe(true);
    expect(res.body.trust.hasEncryptedLetter).toBe(true);
  }, 20000);

  it("GET /api/trusts/grantor/:address should list grantor trusts", async () => {
    const res = await request(app).get(`/api/trusts/grantor/${testGrantor}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const found = res.body.trusts.find((t: any) => t.id === createdTrustId);
    expect(found).toBeDefined();
  });

  it("GET /api/trusts/beneficiary/:address should list beneficiary trusts", async () => {
    const res = await request(app).get(`/api/trusts/beneficiary/${testBeneficiary}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const found = res.body.trusts.find((t: any) => t.id === createdTrustId);
    expect(found).toBeDefined();
  });

  it("GET /api/trusts/:id/letter should decrypt letter for the grantor", async () => {
    const res = await request(app)
      .get(`/api/trusts/${createdTrustId}/letter?requester=${testGrantor}`);

    expect(res.status).toBe(200);
    expect(res.body.letter).toBe(
      "Dearest Sophia, this trust was built for your future education and financial freedom."
    );
  });

  it("GET /api/trusts should return public on-chain trusts", async () => {
    const res = await request(app).get("/api/trusts");

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.trusts)).toBe(true);
    const found = res.body.trusts.find((t: any) => t.id === createdTrustId);
    expect(found).toBeDefined();
  });
});
