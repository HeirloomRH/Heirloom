import "dotenv/config";
import { setWebhook, getWebhookInfo, deleteWebhook } from "../src/lib/telegram.js";

async function main() {
  const arg = process.argv[2];

  if (arg === "delete") {
    console.log("[Telegram] Deleting webhook...");
    await deleteWebhook();
    console.log("[Telegram] Webhook deleted successfully.");
    const info = await getWebhookInfo();
    console.log("[Telegram] Current Webhook Info:", info);
    return;
  }

  if (arg === "info" || !arg) {
    console.log("[Telegram] Fetching current Webhook Info...");
    const info = await getWebhookInfo();
    console.log("[Telegram] Current Webhook Info:", info);
    if (!arg) {
      console.log("\nUsage:");
      console.log("  bun run scripts/set-webhook.ts <https://your-domain.com/api/telegram/webhook>");
      console.log("  bun run scripts/set-webhook.ts info");
      console.log("  bun run scripts/set-webhook.ts delete");
    }
    return;
  }

  const webhookUrl = arg.trim();
  if (!webhookUrl.startsWith("https://")) {
    console.error("Error: Telegram requires the webhook URL to use HTTPS (e.g. https://domain.com/api/telegram/webhook)");
    process.exit(1);
  }

  console.log(`[Telegram] Setting webhook to: ${webhookUrl}`);
  await setWebhook(webhookUrl);
  console.log("[Telegram] Webhook registered successfully!");

  const info = await getWebhookInfo();
  console.log("[Telegram] Updated Webhook Info:", info);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
