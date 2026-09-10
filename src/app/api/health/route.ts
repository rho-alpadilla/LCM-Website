import { NextResponse } from "next/server";

import {
  checkD1Connection,
  requireCloudflareBindings,
} from "@/server/cloudflare/bindings";

const responseHeaders = {
  "Cache-Control": "no-store",
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { DB } = await requireCloudflareBindings();
    const databaseIsReady = await checkD1Connection(DB);

    if (!databaseIsReady) {
      throw new Error("D1 health probe returned an unexpected result.");
    }

    return NextResponse.json(
      {
        service: "lifechangers-ministry-web",
        status: "ok",
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "health_check_failed",
        errorType: error instanceof Error ? error.name : "UnknownError",
      }),
    );

    return NextResponse.json(
      {
        service: "lifechangers-ministry-web",
        status: "unavailable",
      },
      {
        status: 503,
        headers: responseHeaders,
      },
    );
  }
}
