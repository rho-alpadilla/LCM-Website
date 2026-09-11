import { ApplicationError } from "@/lib/errors/application-error";
import { mediaPolicy } from "@/features/media/policy";
import type { StaffContext } from "@/server/repositories/access-control-repository";
import type {
  AllowedMediaMimeType,
  MediaRepositoryPort,
  MediaStorageScope,
} from "@/server/repositories/media-repository";

type UploadFile = Pick<File, "arrayBuffer" | "name" | "size" | "type">;
type UploadInput = {
  storageScope: MediaStorageScope;
  file: UploadFile;
  altText?: string | null;
  isDecorative?: boolean;
};
type Dependencies = {
  createId?: () => string;
  now?: () => Date;
  policy?: typeof mediaPolicy;
};

export type MediaBucketPort = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: R2PutOptions,
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

const fileTypes = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
  avif: { mimeType: "image/avif", extension: "avif" },
  pdf: { mimeType: "application/pdf", extension: "pdf" },
} as const;

type DetectedFileType = (typeof fileTypes)[keyof typeof fileTypes];

export function detectAllowedFileType(
  bytes: Uint8Array,
): DetectedFileType | null {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a &&
    ascii(bytes, 12, 16) === "IHDR" &&
    ascii(bytes, bytes.length - 8, bytes.length - 4) === "IEND"
  )
    return fileTypes.png;
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  ) {
    return fileTypes.jpeg;
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP" &&
    readLittleEndianUint32(bytes, 4) + 8 === bytes.length
  )
    return fileTypes.webp;
  if (
    bytes.length >= 12 &&
    ascii(bytes, 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(ascii(bytes, 8, 12)) &&
    readBigEndianUint32(bytes, 0) <= bytes.length
  )
    return fileTypes.avif;
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 5) === "%PDF-" &&
    ascii(bytes, Math.max(0, bytes.length - 1024), bytes.length).includes(
      "%%EOF",
    )
  )
    return fileTypes.pdf;
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function readLittleEndianUint32(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset, true);
}

function readBigEndianUint32(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset, false);
}

function cleanOriginalName(name: string) {
  const basename = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = basename.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "upload").slice(0, 255);
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export class MediaService {
  private readonly createId: () => string;
  private readonly now: () => Date;
  private readonly policy: typeof mediaPolicy;

  constructor(
    private readonly repository: MediaRepositoryPort,
    private readonly bucket: MediaBucketPort,
    dependencies: Dependencies = {},
  ) {
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date());
    this.policy = dependencies.policy ?? mediaPolicy;
  }

  async listReadyAssets(actor: StaffContext, scope?: MediaStorageScope) {
    this.requirePermission(actor);
    return this.repository.listReadyAssets(scope);
  }

  async upload(actor: StaffContext, input: UploadInput) {
    this.requirePermission(actor);
    const isDecorative = input.isDecorative ?? false;
    const altText = input.altText?.trim() || null;
    if (!input.file.size) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Choose a non-empty file.",
      );
    }
    const maximum =
      input.storageScope === "bulletins"
        ? this.policy.bulletinPdfMaxBytes
        : this.policy.imageMaxBytes;
    if (input.file.size > maximum) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        `The file exceeds the ${Math.round(maximum / 1024 / 1024)} MB limit.`,
      );
    }

    const data = await input.file.arrayBuffer();
    if (data.byteLength !== input.file.size) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "The uploaded file size changed while it was being processed.",
      );
    }
    const detected = detectAllowedFileType(new Uint8Array(data));
    if (
      !detected ||
      !this.scopeAccepts(input.storageScope, detected.mimeType)
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        input.storageScope === "bulletins"
          ? "Bulletins must be valid PDF files."
          : "Images must be valid JPEG, PNG, WebP, or AVIF files.",
      );
    }
    if (
      input.file.type &&
      input.file.type.toLowerCase() !== detected.mimeType
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "The file contents do not match its declared type.",
      );
    }
    if (
      detected.mimeType.startsWith("image/") &&
      !isDecorative &&
      (!altText || altText.length > 500)
    ) {
      throw new ApplicationError(
        "VALIDATION_FAILED",
        "Describe the image for visitors using screen readers, or mark it decorative.",
      );
    }
    if (altText && altText.length > 500) {
      throw new ApplicationError("VALIDATION_FAILED", "Alt text is too long.");
    }

    const mediaId = this.createId();
    const correlationId = this.createId();
    const createdAt = this.now().toISOString();
    const prefix =
      input.storageScope === "bulletins" ? "bulletins" : "public-content";
    const date = createdAt.slice(0, 7).replace("-", "/");
    const objectKey = `${prefix}/${date}/${mediaId}.${detected.extension}`;
    const checksum = await crypto.subtle.digest("SHA-256", data);
    const checksumSha256 = hex(checksum);
    const originalName = cleanOriginalName(input.file.name);

    await this.repository.reserveUpload({
      ...this.identity(actor.id, mediaId, createdAt, correlationId),
      storageScope: input.storageScope,
      objectKey,
      originalName,
      mimeType: detected.mimeType,
      sizeBytes: data.byteLength,
      altText: detected.mimeType.startsWith("image/") ? altText : null,
      isDecorative: detected.mimeType.startsWith("image/") && isDecorative,
      totalStorageMaxBytes: this.policy.totalStorageMaxBytes,
    });

    try {
      await this.bucket.put(objectKey, data, {
        sha256: checksum,
        httpMetadata: {
          contentType: detected.mimeType,
          contentDisposition:
            detected.mimeType === "application/pdf"
              ? `attachment; filename="bulletin-${mediaId}.pdf"`
              : "inline",
          cacheControl: "private, no-store",
        },
        customMetadata: { mediaId, storageScope: input.storageScope },
      });
    } catch (error) {
      const failure = await Promise.allSettled([
        this.repository.failUpload({
          ...this.identity(actor.id, mediaId, createdAt, correlationId),
          reasonCode: "r2_write_failed",
        }),
      ]);
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The file could not be stored.",
        failure[0].status === "rejected"
          ? new AggregateError([error, failure[0].reason])
          : error,
      );
    }

    try {
      await this.repository.completeUpload({
        ...this.identity(actor.id, mediaId, createdAt, correlationId),
        checksumSha256,
      });
    } catch (error) {
      const cleanup = await Promise.allSettled([
        this.bucket.delete(objectKey),
        this.repository.failUpload({
          ...this.identity(actor.id, mediaId, createdAt, correlationId),
          reasonCode: "metadata_completion_failed",
        }),
      ]);
      const cleanupErrors = cleanup.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "The file upload could not be completed.",
        cleanupErrors.length
          ? new AggregateError([error, ...cleanupErrors])
          : error,
      );
    }

    return { mediaId, objectKey, mimeType: detected.mimeType };
  }

  private requirePermission(actor: StaffContext) {
    if (
      actor.accountStatus !== "active" ||
      !actor.permissions.includes("content.media.manage")
    ) {
      throw new ApplicationError(
        "FORBIDDEN",
        "This account cannot manage media.",
      );
    }
  }

  private scopeAccepts(
    scope: MediaStorageScope,
    mimeType: AllowedMediaMimeType,
  ) {
    return scope === "bulletins"
      ? mimeType === "application/pdf"
      : mimeType.startsWith("image/");
  }

  private identity(
    actorStaffId: string,
    mediaId: string,
    createdAt: string,
    correlationId: string,
  ) {
    return {
      mediaId,
      actorStaffId,
      auditLogId: this.createId(),
      correlationId,
      createdAt,
    };
  }
}
