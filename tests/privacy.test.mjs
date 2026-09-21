import assert from "node:assert";
import { test } from "node:test";

const BASE_URL = "http://localhost:3001";

test("Heirloom Privacy API Endpoints & Zero-Knowledge Integration", async (t) => {
  await t.test("1. GET / - Informational root endpoint returns privacy status", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.name, "Heirloom API");
    assert.ok(data.privacy);
    assert.strictEqual(data.privacy.h0OnChainTrust, "live");
  });

  await t.test("2. GET /api/sets/meter - Anonymity set size meter", async () => {
    const res = await fetch(`${BASE_URL}/api/sets/meter`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.anonymitySetSize >= 1);
    assert.strictEqual(data.anonymitySetPool, "rhc_mainnet_pool_v1");
  });

  await t.test("3. GET /api/proofs/solvency - Solvency proof status", async () => {
    const res = await fetch(`${BASE_URL}/api/proofs/solvency`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.isSolvent, true);
    assert.ok(data.latestEpoch);
  });

  await t.test("4. POST /api/private/deposit - Record ZK deposit commitment", async () => {
    const res = await fetch(`${BASE_URL}/api/private/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trustId: "101",
        commitment: `0x_commitment_${Date.now()}`,
        nullifier: `0x_nullifier_${Date.now()}`,
        ciphertext: "0x_encrypted_note_payload",
        blockNumber: 1234567,
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, "indexed");
  });

  await t.test("5. POST /api/attest/provision - Generate proof-of-provision attestation", async () => {
    const res = await fetch(`${BASE_URL}/api/attest/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trustId: "101",
        thresholdAmount: 50000,
        nonce: "test_nonce_123",
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.attestationHash);
  });

  await t.test("6. POST /api/disclose/grant & revoke - Scoped disclosure key management", async () => {
    const grantRes = await fetch(`${BASE_URL}/api/disclose/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trustId: "101",
        granteeAddress: "0x1111111111111111111111111111111111111111",
        cipherKey: "encrypted_key_for_tax_accountant",
      }),
    });
    assert.strictEqual(grantRes.status, 200);
    const grantData = await grantRes.json();
    assert.strictEqual(grantData.success, true);

    const revokeRes = await fetch(`${BASE_URL}/api/disclose/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trustId: "101",
        granteeAddress: "0x1111111111111111111111111111111111111111",
      }),
    });
    assert.strictEqual(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.strictEqual(revokeData.success, true);
  });

  await t.test("7. GET /api/migration/status - Custodial beta migration status", async () => {
    const res = await fetch(`${BASE_URL}/api/migration/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok("totalTrusts" in data);
  });
});
