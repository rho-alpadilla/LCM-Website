// OpenNext generates this module before Wrangler bundles the custom Worker.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated build output is intentionally absent in a clean checkout.
import openNextWorker from "./.open-next/worker.js";

import { InquiryRepository } from "./src/backend/repositories/inquiries/repository";
import { InquiryService } from "./src/backend/services/inquiries/service";
import { PrayerRepository } from "./src/backend/repositories/prayer/repository";
import { PrayerService } from "./src/backend/services/prayer/service";
import { PasswordAuthenticationRepository } from "./src/backend/repositories/staff/password-authentication-repository";
import { PasswordAuthenticationService } from "./src/backend/services/staff/password-authentication-service";
export { StaffAuthenticationCoordinator } from "./src/backend/auth/password-hash-coordinator";

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
    const passwordService = new PasswordAuthenticationService(
      new PasswordAuthenticationRepository(environment.DB),
      {
        async verifyPassword() {
          throw new Error(
            "Scheduled password expiry does not verify passwords.",
          );
        },
        async createPasswordHash() {
          throw new Error(
            "Scheduled password expiry does not create passwords.",
          );
        },
      },
      {
        now: () => new Date(controller.scheduledTime),
      },
    );
    const [prayerResult, inquiryResult, passwordResult] = await Promise.all([
      prayerService.runRetention(100),
      inquiryService.runRetention(100),
      passwordService.expireOverdueTemporaryPasswords(100),
    ]);
    console.info(
      JSON.stringify({
        event: "website_retention_completed",
        prayerProcessed: prayerResult.processed,
        inquiryProcessed: inquiryResult.processed,
        temporaryPasswordAccountsDisabled: passwordResult.processed,
        scheduledTime: controller.scheduledTime,
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
