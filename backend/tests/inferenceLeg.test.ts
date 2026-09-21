import { describe, it, expect } from "bun:test";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { app } from "../src/app.js";
import { pool } from "../src/db/index.js";
import {
  beneficiaryKeyFromAddress,
  verifyBeneficiaryKeySignature,
} from "../src/services/inferenceLegService.js";

let dbAvailable = false;
if (process.env.DATABASE_URL) {
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout")), 1500),
      ),
    ]);
    await client.query("SELECT 1");
    client.release();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}

describe("beneficiaryKeyFromAddress", () => {
  it("right-pads a wallet address into a bytes32 key, per the spec's bytes32(uint256(uint160(recipient))) scheme", () => {
    const key = beneficiaryKeyFromAddress("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    expect(key).toBe("0x0000000000000000000000003C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    expect(key.length).toBe(66); // 0x + 64 hex chars = 32 bytes
  });
});

describe("verifyBeneficiaryKeySignature", () => {
  const account = privateKeyToAccount(
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  );
  const trustId = "test-trust-id";
  const keyHash = ("0x" + "be".repeat(32)) as `0x${string}`;
  const timestamp = Math.floor(Date.now() / 1000);

  async function sign() {
    return account.signTypedData({
      domain: {
        name: "Heirloom Trust Protocol",
        version: "1",
        chainId: 4663,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      types: {
        BeneficiaryKeyRegistration: [
          { name: "trustId", type: "string" },
          { name: "beneficiary", type: "address" },
          { name: "keyHash", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
        ],
      },
      primaryType: "BeneficiaryKeyRegistration",
      message: { trustId, beneficiary: account.address, keyHash, timestamp: BigInt(timestamp) },
    });
  }

  it("accepts a genuine signature over the exact registered fields", async () => {
    const signature = await sign();
    const isValid = await verifyBeneficiaryKeySignature({
      trustId,
      beneficiaryAddress: account.address,
      keyHash,
      timestamp,
      signature,
    });
    expect(isValid).toBe(true);
  });

  it("rejects a signature if the keyHash was changed after signing", async () => {
    const signature = await sign();
    const tamperedKeyHash = ("0x" + "ff".repeat(32)) as `0x${string}`;
    const isValid = await verifyBeneficiaryKeySignature({
      trustId,
      beneficiaryAddress: account.address,
      keyHash: tamperedKeyHash,
      timestamp,
      signature,
    });
    expect(isValid).toBe(false);
  });

  it("rejects a signature from a different wallet than the one it's claimed to authorize", async () => {
    const signature = await sign();
    const otherAccount = privateKeyToAccount(
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    );
    const isValid = await verifyBeneficiaryKeySignature({
      trustId,
      beneficiaryAddress: otherAccount.address,
      keyHash,
      timestamp,
      signature,
    });
    expect(isValid).toBe(false);
  });
});

describe("POST /api/trusts/:id/legs/inference", () => {
  it("rejects a request missing required fields", async () => {
    const res = await request(app).post("/api/trusts/test-trust-id/legs/inference").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("grantorAddress");
  });

  it("rejects a non-integer or zero cadenceDays", async () => {
    const res = await request(app).post("/api/trusts/test-trust-id/legs/inference").send({
      grantorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      usdgPerCycle: "100",
      cadenceDays: 0,
      totalUsdg: "300",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("cadenceDays");
  });

  describe.skipIf(!dbAvailable)("with a database", () => {
    it("404s for a trust that doesn't exist", async () => {
      const res = await request(app)
        .post("/api/trusts/00000000-0000-0000-0000-000000000000/legs/inference")
        .send({
          grantorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          usdgPerCycle: "100",
          cadenceDays: 30,
          totalUsdg: "300",
        });
      expect(res.status).toBe(404);
    });
  });
});

describe("POST /api/beneficiary/key", () => {
  it("rejects a request missing required fields", async () => {
    const res = await request(app).post("/api/beneficiary/key").send({});
    expect(res.status).toBe(400);
  });

  it("rejects a malformed keyHash", async () => {
    const res = await request(app)
      .post("/api/beneficiary/key")
      .send({
        trustId: "test-trust-id",
        beneficiaryAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        keyHash: "not-a-hex-value",
        timestamp: Math.floor(Date.now() / 1000),
        signature: "0x00",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("keyHash");
  });

  it("rejects an invalid beneficiaryAddress", async () => {
    const res = await request(app)
      .post("/api/beneficiary/key")
      .send({
        trustId: "test-trust-id",
        beneficiaryAddress: "not-an-address",
        keyHash: "0x" + "00".repeat(32),
        timestamp: Math.floor(Date.now() / 1000),
        signature: "0x00",
      });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orbio/quote", () => {
  it("rejects a request with no usdgIn parameter", async () => {
    const res = await request(app).get("/api/orbio/quote");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("usdgIn");
  });

  it("rejects a zero usdgIn", async () => {
    const res = await request(app).get("/api/orbio/quote?usdgIn=0");
    expect(res.status).toBe(400);
  });
});
