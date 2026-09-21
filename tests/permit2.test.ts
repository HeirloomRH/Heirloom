import { describe, it, expect } from "bun:test";
import {
  PERMIT2_ADDRESS,
  PERMIT2_DOMAIN,
  PERMIT2_TYPES,
  buildPermit2TypedData,
  buildPermit2ApprovalRequest,
  generatePermit2Nonce,
} from "../src/lib/heirloom/permit2";
import { USDG_ADDRESS } from "../src/lib/heirloom/swap-router";
import { ROBINHOOD_CHAIN_ID } from "../src/lib/chain";

describe("Permit2 Client Utilities", () => {
  it("defaults to the canonical Permit2 contract on Robinhood Chain", () => {
    expect(PERMIT2_ADDRESS).toBe("0x000000000022D473030F116dDEE9F6B43aC78BA3");
    expect(PERMIT2_DOMAIN.chainId).toBe(ROBINHOOD_CHAIN_ID);
    expect(PERMIT2_DOMAIN.verifyingContract).toBe(PERMIT2_ADDRESS);
  });

  it("builds correct approval request for USDG spending by Permit2", () => {
    const req = buildPermit2ApprovalRequest();
    expect(req.address).toBe(USDG_ADDRESS);
    expect(req.functionName).toBe("approve");
    expect(req.args[0]).toBe(PERMIT2_ADDRESS);
  });

  it("generates positive unique nonces", () => {
    const n1 = generatePermit2Nonce();
    const n2 = generatePermit2Nonce();
    expect(n1 > 0n).toBe(true);
    expect(n2 > 0n).toBe(true);
    expect(n1 !== n2).toBe(true);
  });

  it("builds standard EIP-712 PermitTransferFrom typed data for wagmi", () => {
    const spender = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const amount = 500_000000n; // 500 USDG

    const typed = buildPermit2TypedData({
      amount,
      spender,
    });

    expect(typed.domain.chainId).toBe(4663);
    expect(typed.domain.verifyingContract).toBe(PERMIT2_ADDRESS);
    expect(typed.primaryType).toBe("PermitTransferFrom");
    expect(typed.message.permitted.token).toBe(USDG_ADDRESS);
    expect(typed.message.permitted.amount).toBe(amount);
    expect(typed.message.spender).toBe(spender);
    expect(typed.message.deadline > 0n).toBe(true);
    expect(typed.types.PermitTransferFrom.length).toBe(4);
    expect(typed.types.TokenPermissions.length).toBe(2);
  });
});
