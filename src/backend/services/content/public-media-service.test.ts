import { describe, expect, it, vi } from "vitest";

import type { PublicContentRepositoryPort } from "@/backend/repositories/content/public-repository";

import { PublicMediaService } from "./public-media-service";

const mediaId = "9d3a2ee4-7f94-4e95-ae5b-5c0650b8749e";

function repository(
  media: Awaited<ReturnType<PublicContentRepositoryPort["findPublicMedia"]>>,
) {
  return {
    findPublicMedia: vi.fn().mockResolvedValue(media),
  } as unknown as PublicContentRepositoryPort;
}

function bucket(size = 4) {
  return {
    get: vi.fn().mockResolvedValue({
      body: new Uint8Array([116, 101, 115, 116]) as unknown as ReadableStream,
      httpEtag: '"safe-etag"',
      size,
    }),
  };
}

describe("PublicMediaService", () => {
  it("does not query storage for invalid or unpublished media ids", async () => {
    const mediaRepository = repository(null);
    const mediaBucket = bucket();
    const service = new PublicMediaService(mediaRepository, mediaBucket);

    await expect(service.deliver("not-an-id", null)).resolves.toBeNull();
    await expect(service.deliver(mediaId, null)).resolves.toBeNull();
    expect(mediaBucket.get).not.toHaveBeenCalled();
  });

  it("streams an authorized image with fixed safe response headers", async () => {
    const service = new PublicMediaService(
      repository({
        objectKey: `public-content/2026/09/${mediaId}.webp`,
        originalName: "cover.webp",
        mimeType: "image/webp",
        sizeBytes: 4,
      }),
      bucket(),
    );

    const response = await service.deliver(mediaId, null);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("image/webp");
    expect(response?.headers.get("content-disposition")).toBe("inline");
    expect(response?.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response?.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
  });

  it("forces PDFs to download with a sanitized filename", async () => {
    const service = new PublicMediaService(
      repository({
        objectKey: `bulletins/2026/09/${mediaId}.pdf`,
        originalName: 'Sunday "News".pdf',
        mimeType: "application/pdf",
        sizeBytes: 4,
      }),
      bucket(),
    );

    const response = await service.deliver(mediaId, null);
    expect(response?.headers.get("content-disposition")).toContain(
      'attachment; filename="Sunday _News_.pdf"',
    );
  });

  it("returns a bodyless 304 for a matching ETag", async () => {
    const service = new PublicMediaService(
      repository({
        objectKey: `public-content/2026/09/${mediaId}.png`,
        originalName: "cover.png",
        mimeType: "image/png",
        sizeBytes: 4,
      }),
      bucket(),
    );

    const response = await service.deliver(mediaId, 'W/"safe-etag"');
    expect(response?.status).toBe(304);
    expect(response?.headers.has("content-length")).toBe(false);
  });

  it("rejects an R2 object whose size does not match D1 metadata", async () => {
    const service = new PublicMediaService(
      repository({
        objectKey: `public-content/2026/09/${mediaId}.png`,
        originalName: "cover.png",
        mimeType: "image/png",
        sizeBytes: 5,
      }),
      bucket(4),
    );

    await expect(service.deliver(mediaId, null)).resolves.toBeNull();
  });
});
