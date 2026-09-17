// OpenNext generates this module before Wrangler bundles the custom Worker.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated build output is intentionally absent in a clean checkout.
import openNextWorker from "./.open-next/worker.js";

import { PrayerRepository } from "./src/server/repositories/prayer-repository";
import { PrayerService } from "./src/server/services/prayer-service";

export default {
  fetch: openNextWorker.fetch,

  async scheduled(controller, environment) {
    const service = new PrayerService({
      repository: new PrayerRepository(environment.DB),
      now: () => new Date(controller.scheduledTime),
    });
    const result = await service.runRetention(100);
    console.info(
      JSON.stringify({
        event: "prayer_retention_completed",
        processed: result.processed,
        scheduledTime: controller.scheduledTime,
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
