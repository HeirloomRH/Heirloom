import "dotenv/config";
import { app } from "./app.js";
import { migrate } from "./db/migrate.js";
import { startHeartbeatWorker } from "./services/heartbeatWorker.js";
import { startInferenceReleaseWorker } from "./services/inferenceReleaseWorker.js";
import { config } from "./config.js";

async function bootstrap() {
  try {
    await migrate();
  } catch (error) {
    console.error("[bootstrap] Migration failed on startup:", error);
    process.exit(1);
  }

  // Start dead-man's switch heartbeat monitor (runs every 60s)
  startHeartbeatWorker(60000);

  // Start CREDIT inference-allowance release monitor
  startInferenceReleaseWorker(config.inferenceReleaseIntervalMs);

  app.listen(config.port, () => {
    console.log(
      `[Heirloom API] Server listening on port ${config.port} (Robinhood Chain ID: ${config.rhcId})`,
    );
  });
}

bootstrap();
