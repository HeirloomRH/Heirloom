import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";
import { pool, query } from "../src/db/index.js";
import { checkDeadManSwitches } from "../src/services/heartbeatWorker.js";

let dbAvailable = false;
if (process.env.DATABASE_URL) {
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
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

describe.skipIf(!dbAvailable)("28-Day Succession Grace Period & Worker", () => {
  let testTrustId: string;
  const grantorAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const beneficiaryAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const randomVaultIndex = Math.floor(20000 + Math.random() * 70000);

  beforeAll(async () => {
    // Create a funded trust for testing grace period
    const res = await query(
      `INSERT INTO trusts (
        name, grantor_address, beneficiary_address, vault_index, vault_address,
        is_revocable, status, corpus_funded, heartbeat_window_seconds,
        last_heartbeat_at, heartbeat_deadline
      ) VALUES (
        'Grace Period Test Trust', $1, $2, $3, '0x0000000000000000000000000000000000009999',
        TRUE, 'active', TRUE, 7776000,
        NOW() - INTERVAL '95 days', NOW() - INTERVAL '5 days'
      ) RETURNING id`,
      [grantorAddress, beneficiaryAddress, randomVaultIndex]
    );
    testTrustId = res.rows[0].id;
  });

  afterAll(async () => {
    if (testTrustId) {
      await query("DELETE FROM trusts WHERE id = $1", [testTrustId]);
    }
  });

  it("should transition active trust past heartbeat deadline to in_grace_period with 28-day deadline", async () => {
    await checkDeadManSwitches();

    const checkRes = await query("SELECT status, grace_period_deadline FROM trusts WHERE id = $1", [
      testTrustId,
    ]);
    expect(checkRes.rows[0].status).toBe("in_grace_period");
    expect(checkRes.rows[0].grace_period_deadline).toBeDefined();

    // Check GET /:id returns in_grace_period status and gracePeriodDeadline
    const apiRes = await request(app).get(`/api/trusts/${testTrustId}`);
    expect(apiRes.status).toBe(200);
    expect(apiRes.body.trust.status).toBe("in_grace_period");
    expect(apiRes.body.trust.gracePeriodDeadline).toBeDefined();
  }, 15000);

  it("should prevent beneficiary succession claim while trust is in_grace_period", async () => {
    const claimRes = await request(app)
      .post(`/api/trusts/${testTrustId}/claim`)
      .send({
        beneficiaryAddress,
        tokenSymbolOrAddress: "USDG",
      });

    // Should be rejected because grace period protects vault assets
    expect(claimRes.status).toBe(400);
    expect(claimRes.body.error).toContain("grace period");
  }, 15000);

  it("should prevent a beneficiary from claiming an already-unlocked milestone while trust is in_grace_period", async () => {
    const schedRes = await query(
      `INSERT INTO trust_vesting_schedules (trust_id, unlock_timestamp, percentage_bps, claimed)
       VALUES ($1, NOW() - INTERVAL '1 day', 10000, FALSE) RETURNING id`,
      [testTrustId]
    );
    const scheduleId = schedRes.rows[0].id;

    const claimRes = await request(app)
      .post(`/api/trusts/${testTrustId}/claim`)
      .send({
        beneficiaryAddress,
        tokenSymbolOrAddress: "USDG",
        scheduleId,
      });

    // Milestone date has passed, but grace period must still block it —
    // otherwise a missed heartbeat becomes a way to force early claims.
    expect(claimRes.status).toBe(400);
    expect(claimRes.body.error).toContain("grace period");
  }, 15000);

  it("should transition from in_grace_period to succession_triggered once 28 days pass", async () => {
    // Fast-forward grace_period_deadline into the past
    await query(
      `UPDATE trusts
       SET grace_period_deadline = NOW() - INTERVAL '1 hour'
       WHERE id = $1`,
      [testTrustId]
    );

    await checkDeadManSwitches();

    const checkRes = await query("SELECT status FROM trusts WHERE id = $1", [testTrustId]);
    expect(checkRes.rows[0].status).toBe("succession_triggered");

    const apiRes = await request(app).get(`/api/trusts/${testTrustId}`);
    expect(apiRes.status).toBe(200);
    expect(apiRes.body.trust.status).toBe("succession_triggered");
  }, 15000);
});
