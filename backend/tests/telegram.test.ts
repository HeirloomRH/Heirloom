import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app.js";
import { pool } from "../src/db/index.js";

let dbAvailable = false;
if (process.env.DATABASE_URL) {
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout")), 1500)
      ),
    ]);
    await client.query("SELECT 1");
    client.release();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}

describe("Telegram Bot API & Webhook", () => {
  it("GET /api/telegram/webhook-status should return bot configuration info", async () => {
    const res = await request(app).get("/api/telegram/webhook-status");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(typeof res.body.configured).toBe("boolean");
    expect(typeof res.body.botUsername).toBe("string");
  });

  it("POST /api/telegram/webhook should acknowledge Telegram updates with 200 ok", async () => {
    const res = await request(app)
      .post("/api/telegram/webhook")
      .send({
        update_id: 123456789,
        message: {
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 987654321, type: "private" },
          text: "/status",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe.skipIf(!dbAvailable)("Telegram Trust Linking Integration", () => {
  it("POST /api/trusts/:id/telegram-link should return 404 for non-existent trust", async () => {
    const res = await request(app)
      .post("/api/trusts/00000000-0000-0000-0000-000000000000/telegram-link")
      .send({});

    expect(res.status).toBe(404);
  });

  it("DELETE /api/trusts/:id/telegram-link should return 404 for non-existent trust", async () => {
    const res = await request(app)
      .delete("/api/trusts/00000000-0000-0000-0000-000000000000/telegram-link");

    expect(res.status).toBe(404);
  });
});
