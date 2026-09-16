import type { NextRequest } from "next/server";

import { requireCloudflareBindings } from "@/server/cloudflare/bindings";
import { PublicContentRepository } from "@/server/repositories/public-content-repository";
import { PublicMediaService } from "@/server/services/public-media-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ mediaId: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const [{ mediaId }, environment] = await Promise.all([
      params,
      requireCloudflareBindings(),
    ]);
    const service = new PublicMediaService(
      new PublicContentRepository(environment.DB),
      environment.WEBSITE_FILES,
    );
    const response = await service.deliver(
      mediaId,
      request.headers.get("if-none-match"),
    );
    return response ?? notFoundResponse();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "public_media_delivery_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return new Response("The file could not be loaded.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

function notFoundResponse() {
  return new Response("File not found.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
