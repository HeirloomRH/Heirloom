import test from "node:test";
import assert from "node:assert/strict";

/**
 * Pure simulation of Heartbeat & Grace Period State Machine
 */
function evaluateTrustStatus(trust, now) {
  const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
  const graceDeadline = trust.grace_period_deadline
    ? new Date(trust.grace_period_deadline)
    : (deadline ? new Date(deadline.getTime() + 28 * 86400000) : null);

  if (!deadline) {
    return trust.status;
  }

  if (graceDeadline && now > graceDeadline) {
    return "succession_triggered";
  }

  if (now > deadline && now <= graceDeadline) {
    return "in_grace_period";
  }

  return trust.status === "in_grace_period" ? "in_grace_period" : trust.status;
}

function canClaimAssets(status, now, graceDeadline) {
  const isSuccession = status === "succession_triggered" || (graceDeadline && now > graceDeadline);
  const isInGracePeriod = !isSuccession && status === "in_grace_period";

  if (isInGracePeriod) {
    return { eligible: false, reason: "Trust is in 28-day Grace Period. Vault assets remain locked." };
  }

  if (isSuccession) {
    return { eligible: true, reason: "Succession triggered." };
  }

  return { eligible: false, reason: "Trust is active." };
}

test("28-day grace period status transitions and claim eligibility", () => {
  const baseTime = new Date("2026-01-01T00:00:00Z");
  const heartbeatDeadline = new Date(baseTime.getTime() + 90 * 86400000); // Day 90
  const gracePeriodDeadline = new Date(heartbeatDeadline.getTime() + 28 * 86400000); // Day 118

  const trust = {
    status: "active",
    heartbeat_deadline: heartbeatDeadline.toISOString(),
    grace_period_deadline: gracePeriodDeadline.toISOString(),
  };

  // 1. Day 45: Active window
  const day45 = new Date("2026-02-15T00:00:00Z");
  assert.equal(evaluateTrustStatus(trust, day45), "active");
  assert.equal(canClaimAssets("active", day45, gracePeriodDeadline).eligible, false);

  // 2. Day 91: Missed 90d heartbeat deadline -> enters in_grace_period
  const day91 = new Date("2026-04-02T00:00:00Z");
  const graceStatus = evaluateTrustStatus(trust, day91);
  assert.equal(graceStatus, "in_grace_period");

  // Beneficiary CANNOT claim during grace period
  const claimDuringGrace = canClaimAssets(graceStatus, day91, gracePeriodDeadline);
  assert.equal(claimDuringGrace.eligible, false);
  assert.match(claimDuringGrace.reason, /28-day Grace Period/);

  // 3. Check-in during Grace Period (Day 100) -> status resets to active and deadlines reset
  const day100Checkin = new Date("2026-04-11T00:00:00Z");
  const newHeartbeatDeadline = new Date(day100Checkin.getTime() + 90 * 86400000);
  const newGraceDeadline = new Date(newHeartbeatDeadline.getTime() + 28 * 86400000);

  const restoredTrust = {
    status: "active",
    heartbeat_deadline: newHeartbeatDeadline.toISOString(),
    grace_period_deadline: newGraceDeadline.toISOString(),
  };
  assert.equal(evaluateTrustStatus(restoredTrust, day100Checkin), "active");

  // 4. Day 119: 28-day Grace Period expires with zero check-in -> succession_triggered
  const day119 = new Date("2026-04-30T00:00:00Z");
  const successionStatus = evaluateTrustStatus(trust, day119);
  assert.equal(successionStatus, "succession_triggered");

  // Beneficiary CAN claim after grace period expires
  const claimAfterGrace = canClaimAssets(successionStatus, day119, gracePeriodDeadline);
  assert.equal(claimAfterGrace.eligible, true);
});
