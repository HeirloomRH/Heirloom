import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/tokens", () => {
  it("should return the catalog of Robinhood Chain assets", async () => {
    const res = await request(app).get("/api/tokens");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.chainId).toBe(4663);
    expect(Array.isArray(res.body.tokens)).toBe(true);
    expect(res.body.count).toBeGreaterThan(5);

    const symbols = res.body.tokens.map((t: any) => t.symbol);
    expect(symbols).toContain("USDG");
    expect(symbols).toContain("SPCX");
    expect(symbols).toContain("AAPL");
    expect(symbols).toContain("NVDA");
  });

  it("should resolve token by symbol", async () => {
    const res = await request(app).get("/api/tokens/resolve?query=SPCX");
    expect(res.status).toBe(200);
    expect(res.body.token.symbol).toBe("SPCX");
    expect(res.body.token.address.toLowerCase()).toBe("0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea");
  });
});
