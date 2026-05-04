import { createApp } from "./interfaces/http/app.js";
import { env } from "./shared/env.js";
import { logger } from "./shared/logger.js";
import { startWorkers } from "./infrastructure/queue/workers.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`PropNinja API running at http://localhost:${env.PORT}`);
  startWorkers();
});
