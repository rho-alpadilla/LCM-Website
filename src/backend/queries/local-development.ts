import "server-only";

import { headers } from "next/headers";

import { requireCloudflareBindings } from "@/backend/cloudflare/bindings";
import {
  localDevelopmentConfiguration,
  type LocalDevelopmentBindings,
} from "@/backend/development/local-mode";

export async function localDevelopmentIsActiveForCurrentRequest() {
  const [environment, requestHeaders] = await Promise.all([
    requireCloudflareBindings(),
    headers(),
  ]);
  return Boolean(
    localDevelopmentConfiguration(
      environment as LocalDevelopmentBindings,
      requestHeaders.get("host"),
    ),
  );
}
