// OpenNext generates this module before Wrangler bundles the custom Worker.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated build output is intentionally absent in a clean checkout.
import openNextWorker from "./.open-next/worker.js";

import { InquiryRepository } from "./src/backend/repositories/inquiries/repository";
import { InquiryService } from "./src/backend/services/inquiries/service";
import { PrayerRepository } from "./src/backend/repositories/prayer/repository";
import { PrayerService } from "./src/backend/services/prayer/service";

export default {
  fetch: openNextWorker.fetch,

  async scheduled(controller, environment) {
    const prayerService = new PrayerService({
      repository: new PrayerRepository(environment.DB),
      now: () => new Date(controller.scheduledTime),
    });
    const inquiryService = new InquiryService({
      repository: new InquiryRepository(environment.DB),
      now: () => new Date(controller.scheduledTime),
    });
    const [prayerResult, inquiryResult] = await Promise.all([
      prayerService.runRetention(100),
      inquiryService.runRetention(100),
    ]);
    console.info(
      JSON.stringify({
        event: "website_retention_completed",
        prayerProcessed: prayerResult.processed,
        inquiryProcessed: inquiryResult.processed,
        scheduledTime: controller.scheduledTime,
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
