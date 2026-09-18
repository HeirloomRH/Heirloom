import "dotenv/config";
import { app } from "./app.js";
import { migrate } from "./db/migrate.js";

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  try {
    await migrate();
  } catch (error) {
    console.error("[bootstrap] Migration failed on startup:", error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Heirloom API] Server listening on port ${PORT}`);
  });
}

bootstrap();
