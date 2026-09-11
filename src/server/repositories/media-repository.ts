export type MediaStorageScope = "public_content" | "bulletins";
export type AllowedMediaMimeType =
  "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "application/pdf";

export type MediaAssetListItem = {
  id: string;
  storageScope: MediaStorageScope;
  originalName: string;
  mimeType: AllowedMediaMimeType;
  sizeBytes: number;
  altText: string | null;
  isDecorative: boolean;
  createdAt: string;
};

type UploadIdentity = {
  mediaId: string;
  actorStaffId: string;
  auditLogId: string;
  correlationId: string;
  createdAt: string;
};

export type ReserveMediaUploadRecord = UploadIdentity & {
  storageScope: MediaStorageScope;
  objectKey: string;
  originalName: string;
  mimeType: AllowedMediaMimeType;
  sizeBytes: number;
  altText: string | null;
  isDecorative: boolean;
  totalStorageMaxBytes: number;
};

export type CompleteMediaUploadRecord = UploadIdentity & {
  checksumSha256: string;
};

export type FailMediaUploadRecord = UploadIdentity & {
  reasonCode: "r2_write_failed" | "metadata_completion_failed";
};

export interface MediaRepositoryPort {
  reserveUpload(record: ReserveMediaUploadRecord): Promise<void>;
  completeUpload(record: CompleteMediaUploadRecord): Promise<void>;
  failUpload(record: FailMediaUploadRecord): Promise<void>;
  listReadyAssets(scope?: MediaStorageScope): Promise<MediaAssetListItem[]>;
}

type MediaRow = {
  id: string;
  storage_scope: MediaStorageScope;
  original_name: string;
  mime_type: AllowedMediaMimeType;
  size_bytes: number;
  alt_text: string | null;
  is_decorative: number;
  created_at: string;
};

export class MediaRepository implements MediaRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async reserveUpload(record: ReserveMediaUploadRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO media_assets
            (id, storage_scope, object_key, original_name, mime_type,
             size_bytes, alt_text, is_decorative, visibility, upload_status,
             uploaded_by, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'private', 'pending', ?9, ?10
           WHERE ?6 + COALESCE((
             SELECT SUM(size_bytes) FROM media_assets
             WHERE upload_status IN ('pending', 'ready', 'quarantined')
           ), 0) <= ?11`,
        )
        .bind(
          record.mediaId,
          record.storageScope,
          record.objectKey,
          record.originalName,
          record.mimeType,
          record.sizeBytes,
          record.altText,
          record.isDecorative ? 1 : 0,
          record.actorStaffId,
          record.createdAt,
          record.totalStorageMaxBytes,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_logs
            (id, actor_staff_id, actor_type, action, resource_type, resource_id,
             sensitivity, metadata_json, correlation_id, created_at)
           SELECT ?1, ?2, 'staff', 'media.upload_reserved', 'media_asset', ?3,
                  'standard', ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(
          record.auditLogId,
          record.actorStaffId,
          record.mediaId,
          JSON.stringify({
            storageScope: record.storageScope,
            mimeType: record.mimeType,
            sizeBytes: record.sizeBytes,
          }),
          record.correlationId,
          record.createdAt,
        ),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("The application media storage ceiling was reached.");
    }
  }

  async completeUpload(record: CompleteMediaUploadRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE media_assets
           SET checksum_sha256 = ?2, upload_status = 'ready'
           WHERE id = ?1 AND upload_status = 'pending'`,
        )
        .bind(record.mediaId, record.checksumSha256),
      this.database
        .prepare(
          `INSERT INTO audit_logs
            (id, actor_staff_id, actor_type, action, resource_type, resource_id,
             sensitivity, metadata_json, correlation_id, created_at)
           SELECT ?1, ?2, 'staff', 'media.upload_completed', 'media_asset', ?3,
                  'standard', '{}', ?4, ?5 WHERE changes() = 1`,
        )
        .bind(
          record.auditLogId,
          record.actorStaffId,
          record.mediaId,
          record.correlationId,
          record.createdAt,
        ),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("The media reservation is no longer pending.");
    }
  }

  async failUpload(record: FailMediaUploadRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE media_assets SET upload_status = 'deleted'
           WHERE id = ?1 AND upload_status = 'pending'`,
        )
        .bind(record.mediaId),
      this.database
        .prepare(
          `INSERT INTO audit_logs
            (id, actor_staff_id, actor_type, action, resource_type, resource_id,
             sensitivity, metadata_json, correlation_id, created_at)
           SELECT ?1, ?2, 'staff', 'media.upload_failed', 'media_asset', ?3,
                  'standard', ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(
          record.auditLogId,
          record.actorStaffId,
          record.mediaId,
          JSON.stringify({ reasonCode: record.reasonCode }),
          record.correlationId,
          record.createdAt,
        ),
    ]);
  }

  async listReadyAssets(scope?: MediaStorageScope) {
    const result = await this.database
      .prepare(
        `SELECT id, storage_scope, original_name, mime_type, size_bytes,
                alt_text, is_decorative, created_at
         FROM media_assets
         WHERE upload_status = 'ready' AND (?1 IS NULL OR storage_scope = ?1)
         ORDER BY created_at DESC LIMIT 200`,
      )
      .bind(scope ?? null)
      .all<MediaRow>();
    return result.results.map((row) => ({
      id: row.id,
      storageScope: row.storage_scope,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      altText: row.alt_text,
      isDecorative: row.is_decorative === 1,
      createdAt: row.created_at,
    }));
  }
}
