import { describe, it, expect } from "bun:test";
import request from "../backend/node_modules/supertest/index.js";

try {
  process.loadEnvFile("./backend/.env");
} catch {}

const { app } = await import("../backend/src/app.js");
const { pool } = await import("../backend/src/db/index.js");

let dbAvailable = false;
if (process.env.DATABASE_URL) {
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout")), 2000)
      ),
    ]);
    await client.query("SELECT 1");
    client.release();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}

describe("Heirloom Privacy API Endpoints & Zero-Knowledge Integration", () => {
  it("1. GET / - Informational root endpoint returns privacy status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Heirloom API");
    expect(res.body.privacy).toBeDefined();
    expect(res.body.privacy.h0OnChainTrust).toBe("live");
  });
});

describe.skipIf(!dbAvailable)("Heirloom Privacy DB Endpoints", () => {
  it("2. GET /api/sets/meter - Anonymity set size meter", async () => {
    const res = await request(app).get("/api/sets/meter");
    expect(res.status).toBe(200);
    expect(res.body.anonymitySetSize).toBeGreaterThanOrEqual(1);
    expect(res.body.anonymitySetPool).toBe("rhc_mainnet_pool_v1");
  });

  it("3. GET /api/proofs/solvency - Solvency proof status", async () => {
    const res = await request(app).get("/api/proofs/solvency");
    expect(res.status).toBe(200);
    expect(res.body.isSolvent).toBe(true);
    expect(res.body.latestEpoch).toBeDefined();
  });

  it("4. POST /api/private/deposit - Record ZK deposit commitment", async () => {
    const res = await request(app)
      .post("/api/private/deposit")
      .send({
        trustId: "101",
        commitment: `0x_commitment_${Date.now()}`,
        nullifier: `0x_nullifier_${Date.now()}`,
        ciphertext: "0x_encrypted_note_payload",
        blockNumber: 1234567,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("indexed");
  });

  it("5. POST /api/attest/provision - Generate proof-of-provision attestation", async () => {
    const res = await request(app)
      .post("/api/attest/provision")
      .send({
        trustId: "101",
        thresholdAmount: 50000,
        nonce: "test_nonce_123",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.attestationHash).toBeDefined();
  });

  it("6. POST /api/disclose/grant & revoke - Scoped disclosure key management", async () => {
    const grantRes = await request(app)
      .post("/api/disclose/grant")
      .send({
        trustId: "101",
        granteeAddress: "0x1111111111111111111111111111111111111111",
        cipherKey: "encrypted_key_for_tax_accountant",
      });
    expect(grantRes.status).toBe(200);
    expect(grantRes.body.success).toBe(true);

    const revokeRes = await request(app)
      .post("/api/disclose/revoke")
      .send({
        trustId: "101",
        granteeAddress: "0x1111111111111111111111111111111111111111",
      });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);
  });

  it("7. GET /api/migration/status - Custodial beta migration status", async () => {
    const res = await request(app).get("/api/migration/status");
    expect(res.status).toBe(200);
    expect("totalTrusts" in res.body).toBe(true);
  });
});
