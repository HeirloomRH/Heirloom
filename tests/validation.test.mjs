import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAllocations,
  validateSchedule,
  validAddress,
} from "../src/lib/heirloom/validation.mjs";
test("portfolio rejects zero/negative/non-finite weights and non-100 totals", () => {
  for (const weights of [
    [20, 30],
    [0, 100],
    [-10, 110],
    [NaN, 100],
  ])
    assert.ok(
      validateAllocations(
        1000,
        weights.map((weight) => ({ weight })),
      ),
    );
  assert.equal(
    validateAllocations(25000, [
      { weight: 40 },
      { weight: 35 },
      { weight: 25 },
    ]),
    "",
  );
  assert.ok(validateAllocations(Infinity, [{ weight: 100 }]));
});
test("release schedule rejects past, impossible, duplicate and unordered dates", () => {
  for (const dates of [
    ["2025-01-01", "2030-01-01"],
    ["2030-02-30", "2031-01-01"],
    ["2030-01-01", "2030-01-01"],
    ["2031-01-01", "2030-01-01"],
  ])
    assert.ok(
      validateSchedule(
        dates.map((date) => ({ date, percent: 50 })),
        "2026-09-14",
      ),
    );
  assert.equal(
    validateSchedule(
      [
        { date: "2030-01-01", percent: 25 },
        { date: "2035-01-01", percent: 75 },
      ],
      "2026-09-14",
    ),
    "",
  );
  assert.ok(
    validateSchedule([{ date: "2030-01-01", percent: 25 }], "2026-09-14"),
  );
});
test("beneficiary validation rejects zero addresses and malformed hex", () => {
  assert.equal(validAddress("0x" + "0".repeat(40)), false);
  assert.equal(validAddress("0x" + "z".repeat(40)), false);
  assert.equal(validAddress("0x123"), false);
  assert.equal(validAddress("0x" + "1".repeat(40)), true);
});
