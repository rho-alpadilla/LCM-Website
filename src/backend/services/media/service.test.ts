import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/backend/repositories/staff/access-control-repository";
import type { MediaRepositoryPort } from "@/backend/repositories/media/repository";

import {
  detectAllowedFileType,
  type MediaBucketPort,
  MediaService,
} from "./service";

function actor(permissions = ["content.media.manage"]): StaffContext {
  return {
    id: "5d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
    email: "media@example.com",
    displayName: "Media Team",
    accountStatus: "active",
    roles: ["content_editor"],
    permissions,
  };
}

function repository(
  overrides: Partial<MediaRepositoryPort> = {},
): MediaRepositoryPort {
  return {
    reserveUpload: vi.fn().mockResolvedValue(undefined),
    completeUpload: vi.fn().mockResolvedValue(undefined),
    failUpload: vi.fn().mockResolvedValue(undefined),
    listReadyAssets: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function bucket(overrides: Partial<MediaBucketPort> = {}): MediaBucketPort {
  return {
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function pngFile(type = "image/png") {
  const bytes = new Uint8Array(32);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set(new TextEncoder().encode("IEND"), 24);
  return new File([bytes], "church.png", { type });
}

describe("detectAllowedFileType", () => {
  it("detects supported signatures instead of trusting extensions", () => {
    expect(
      detectAllowedFileType(
        new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]),
      ),
    ).toEqual({ mimeType: "image/jpeg", extension: "jpg" });
    expect(
      detectAllowedFileType(new TextEncoder().encode("<svg></svg>")),
    ).toBeNull();
    expect(
      detectAllowedFileType(new TextEncoder().encode("%PDF-1.7\n%%EOF")),
    ).toEqual({ mimeType: "application/pdf", extension: "pdf" });
    expect(
      detectAllowedFileType(new TextEncoder().encode("%PDF-1.7 truncated")),
    ).toBeNull();
  });
});

describe("MediaService", () => {
  it("stores a validated image under a generated key and completes metadata", async () => {
    const reserveUpload = vi.fn().mockResolvedValue(undefined);
    const completeUpload = vi.fn().mockResolvedValue(undefined);
    const put = vi.fn().mockResolvedValue({});
    const ids = ["media-id", "correlation-id", "audit-1", "audit-2"];
    const service = new MediaService(
      repository({ reserveUpload, completeUpload }),
      bucket({ put }),
      {
        createId: () => ids.shift() ?? "generated-id",
        now: () => new Date("2026-09-11T00:00:00.000Z"),
      },
    );

    await expect(
      service.upload(actor(), {
        storageScope: "public_content",
        file: pngFile(),
        altText: "Worship service at Lifechangers Ministry",
      }),
    ).resolves.toMatchObject({
      mediaId: "media-id",
      objectKey: "public-content/2026/09/media-id.png",
      mimeType: "image/png",
    });
    expect(reserveUpload).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png" }),
    );
    expect(put).toHaveBeenCalledOnce();
    const [storedKey, storedBytes, options] = put.mock.calls[0];
    expect(storedKey).toBe("public-content/2026/09/media-id.png");
    expect(storedBytes.byteLength).toBe(32);
    expect(options.sha256.byteLength).toBe(32);
    expect(completeUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("requires alt text for informative images", async () => {
    const service = new MediaService(repository(), bucket());
    await expect(
      service.upload(actor(), {
        storageScope: "public_content",
        file: pngFile(),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects a declared type that disagrees with the file signature", async () => {
    const service = new MediaService(repository(), bucket());
    await expect(
      service.upload(actor(), {
        storageScope: "public_content",
        file: pngFile("image/jpeg"),
        altText: "Church activity",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("records a failed reservation when R2 cannot store the object", async () => {
    const failUpload = vi.fn().mockResolvedValue(undefined);
    const service = new MediaService(
      repository({ failUpload }),
      bucket({ put: vi.fn().mockRejectedValue(new Error("R2 unavailable")) }),
    );
    await expect(
      service.upload(actor(), {
        storageScope: "public_content",
        file: pngFile(),
        isDecorative: true,
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(failUpload).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: "r2_write_failed" }),
    );
  });

  it("checks media permission before processing a file", async () => {
    const file = {
      arrayBuffer: vi.fn(),
      name: "x.png",
      size: 8,
      type: "image/png",
    };
    const service = new MediaService(repository(), bucket());
    await expect(
      service.upload(actor([]), {
        storageScope: "public_content",
        file,
        isDecorative: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });
});
