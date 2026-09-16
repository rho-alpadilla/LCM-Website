import type { PublicContentRepositoryPort } from "@/server/repositories/public-content-repository";

export type PublicMediaBucketPort = {
  get(
    key: string,
  ): Promise<Pick<R2ObjectBody, "body" | "httpEtag" | "size"> | null>;
};

const mediaIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PublicMediaService {
  constructor(
    private readonly repository: PublicContentRepositoryPort,
    private readonly bucket: PublicMediaBucketPort,
  ) {}

  async deliver(mediaId: string, ifNoneMatch: string | null) {
    if (!mediaIdPattern.test(mediaId)) return null;

    const metadata = await this.repository.findPublicMedia(mediaId);
    if (!metadata) return null;

    const object = await this.bucket.get(metadata.objectKey);
    if (!object || object.size !== metadata.sizeBytes) return null;

    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Length": String(metadata.sizeBytes),
      "Content-Type": metadata.mimeType,
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
    });
    headers.set(
      "Content-Disposition",
      metadata.mimeType === "application/pdf"
        ? bulletinDisposition(metadata.originalName)
        : "inline",
    );

    if (etagMatches(ifNoneMatch, object.httpEtag)) {
      headers.delete("Content-Length");
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { status: 200, headers });
  }
}

function etagMatches(value: string | null, etag: string) {
  if (!value) return false;
  return value
    .split(",")
    .map((candidate) => candidate.trim().replace(/^W\//, ""))
    .some((candidate) => candidate === "*" || candidate === etag);
}

function bulletinDisposition(originalName: string) {
  const normalized = originalName.toLowerCase().endsWith(".pdf")
    ? originalName
    : `${originalName}.pdf`;
  const fallback = normalized
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 120);
  return `attachment; filename="${fallback || "church-bulletin.pdf"}"; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}
