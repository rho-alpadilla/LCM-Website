import type {
  ContentBody,
  ContentEntry,
  ContentListItem,
  ContentStatus,
  ContentType,
} from "@/shared/content/types";

export type {
  ContentBody,
  ContentEntry,
  ContentListItem,
  ContentStatus,
  ContentType,
} from "@/shared/content/types";

type MutationIdentity = {
  actorStaffId: string;
  auditLogId: string;
  correlationId: string;
  createdAt: string;
};

export type CreateContentDraftRecord = MutationIdentity & {
  contentId: string;
  contentType: ContentType;
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  coverMediaId: string | null;
};

export type UpdateContentDraftRecord = MutationIdentity & {
  content: ContentEntry;
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  coverMediaId: string | null;
};

export type SubmitContentRecord = MutationIdentity & {
  content: ContentEntry;
  revisionId: string;
  reviewEventId: string;
  snapshotJson: string;
  changeSummary: string;
};

export type ReviewContentRecord = MutationIdentity & {
  content: ContentEntry;
  reviewEventId: string;
  revisionId: string | null;
  reason: string | null;
};

export interface ContentRepositoryPort {
  slugExists(
    contentType: ContentType,
    slug: string,
    excludeContentId?: string,
  ): Promise<boolean>;
  listContent(contentTypes: ContentType[]): Promise<ContentListItem[]>;
  findReadyPublicImage(mediaId: string): Promise<boolean>;
  createDraft(record: CreateContentDraftRecord): Promise<void>;
  updateDraft(record: UpdateContentDraftRecord): Promise<number>;
  findById(contentId: string): Promise<ContentEntry | null>;
  findSubtypeSnapshot(
    content: ContentEntry,
  ): Promise<Record<string, unknown> | null>;
  findCurrentRevisionId(
    contentId: string,
    version: number,
  ): Promise<string | null>;
  submit(record: SubmitContentRecord): Promise<void>;
  approve(
    record: ReviewContentRecord & { isSelfApproval: boolean },
  ): Promise<void>;
  requestChanges(record: ReviewContentRecord): Promise<number>;
  publish(record: ReviewContentRecord): Promise<void>;
  archive(record: ReviewContentRecord): Promise<void>;
}

type ContentRow = {
  id: string;
  content_type: ContentType;
  slug: string;
  title: string;
  summary: string | null;
  body_json: string;
  cover_media_id: string | null;
  status: ContentStatus;
  version: number;
  created_by: string;
  submitted_by: string | null;
};

type BooleanRow = { found: number };
type ContentListRow = {
  id: string;
  content_type: ContentType;
  slug: string;
  title: string;
  status: ContentStatus;
  version: number;
  updated_at: string;
};

function parseContentBody(value: string): ContentBody {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("format" in parsed) ||
    parsed.format !== "plain_text" ||
    !("text" in parsed) ||
    typeof parsed.text !== "string"
  ) {
    throw new Error("Stored content body has an unsupported format.");
  }
  return { format: "plain_text", text: parsed.text };
}

export class ContentRepository implements ContentRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async slugExists(
    contentType: ContentType,
    slug: string,
    excludeContentId?: string,
  ) {
    const result = await this.database
      .prepare(
        `SELECT EXISTS (
           SELECT 1 FROM content_entries
           WHERE content_type = ?1 AND slug = ?2 AND id <> ?3
         ) AS found`,
      )
      .bind(contentType, slug, excludeContentId ?? "")
      .first<BooleanRow>();
    return result?.found === 1;
  }

  async listContent(contentTypes: ContentType[]) {
    if (contentTypes.length === 0) return [];
    const placeholders = contentTypes.map((_, index) => `?${index + 1}`);
    const result = await this.database
      .prepare(
        `SELECT id, content_type, slug, title, status, version, updated_at
         FROM content_entries
         WHERE content_type IN (${placeholders.join(", ")})
         ORDER BY updated_at DESC, title COLLATE NOCASE
         LIMIT 200`,
      )
      .bind(...contentTypes)
      .all<ContentListRow>();
    return result.results.map((row) => ({
      id: row.id,
      contentType: row.content_type,
      slug: row.slug,
      title: row.title,
      status: row.status,
      version: row.version,
      updatedAt: row.updated_at,
    }));
  }

  async findReadyPublicImage(mediaId: string) {
    const row = await this.database
      .prepare(
        `SELECT EXISTS (
           SELECT 1 FROM media_assets
           WHERE id = ?1 AND storage_scope = 'public_content'
             AND mime_type LIKE 'image/%' AND upload_status = 'ready'
         ) AS found`,
      )
      .bind(mediaId)
      .first<BooleanRow>();
    return row?.found === 1;
  }

  async createDraft(record: CreateContentDraftRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO content_entries
            (id, content_type, slug, title, summary, body_json, cover_media_id,
             status, version, created_by, updated_by, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', 1, ?8, ?8, ?9, ?9)`,
        )
        .bind(
          record.contentId,
          record.contentType,
          record.slug,
          record.title,
          record.summary,
          record.bodyJson,
          record.coverMediaId,
          record.actorStaffId,
          record.createdAt,
        ),
      this.auditStatement(record, "content.draft_created", record.contentId, {
        contentType: record.contentType,
      }),
    ]);
  }

  async updateDraft(record: UpdateContentDraftRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE content_entries
           SET slug = ?2, title = ?3, summary = ?4, body_json = ?5,
               cover_media_id = ?6, version = version + 1,
               updated_by = ?7, updated_at = ?8
           WHERE id = ?1 AND status = 'draft' AND version = ?9`,
        )
        .bind(
          record.content.id,
          record.slug,
          record.title,
          record.summary,
          record.bodyJson,
          record.coverMediaId,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.changedRowAuditStatement(
        record,
        "content.draft_updated",
        record.content.id,
        {
          contentType: record.content.contentType,
          version: record.content.version + 1,
        },
      ),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("Content changed before the draft was saved.");
    }
    return record.content.version + 1;
  }

  async findById(contentId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, content_type, slug, title, summary, body_json,
                cover_media_id, status, version, created_by, submitted_by
         FROM content_entries WHERE id = ?1`,
      )
      .bind(contentId)
      .first<ContentRow>();
    if (!row) return null;
    return {
      id: row.id,
      contentType: row.content_type,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: parseContentBody(row.body_json),
      coverMediaId: row.cover_media_id,
      status: row.status,
      version: row.version,
      createdBy: row.created_by,
      submittedBy: row.submitted_by,
    };
  }

  async findSubtypeSnapshot(content: ContentEntry) {
    const queryByType: Partial<Record<ContentType, string>> = {
      ministry: `SELECT short_name AS shortName, contact_email AS contactEmail,
                        contact_phone AS contactPhone, sort_order AS sortOrder
                 FROM ministries WHERE content_id = ?1`,
      series: `SELECT starts_on AS startsOn, ends_on AS endsOn
               FROM sermon_series WHERE content_id = ?1`,
      speaker: `SELECT biography, photo_media_id AS photoMediaId,
                       is_active AS isActive
                FROM speakers WHERE content_id = ?1`,
      sermon: `SELECT series_content_id AS seriesContentId,
                      speaker_content_id AS speakerContentId,
                      preached_at AS preachedAt,
                      scripture_reference AS scriptureReference,
                      video_provider AS videoProvider, video_url AS videoUrl,
                      duration_seconds AS durationSeconds
               FROM sermons WHERE content_id = ?1`,
      announcement: `SELECT visible_from AS visibleFrom,
                            visible_until AS visibleUntil, priority
                     FROM announcements WHERE content_id = ?1`,
      bulletin: `SELECT issue_date AS issueDate, file_media_id AS fileMediaId,
                        edition_label AS editionLabel
                 FROM bulletins WHERE content_id = ?1`,
      schedule: `SELECT activity_type AS activityType,
                        ministry_content_id AS ministryContentId,
                        starts_at AS startsAt, ends_at AS endsAt, timezone,
                        recurrence_rule AS recurrenceRule,
                        recurrence_until AS recurrenceUntil,
                        location_name AS locationName,
                        location_address AS locationAddress,
                        location_visibility AS locationVisibility,
                        contact_email AS contactEmail,
                        contact_phone AS contactPhone,
                        registration_url AS registrationUrl
                 FROM schedule_items WHERE content_id = ?1`,
    };
    const query = queryByType[content.contentType];
    if (!query) return null;
    const row = await this.database
      .prepare(query)
      .bind(content.id)
      .first<Record<string, unknown>>();
    if (!row) return null;
    if (content.contentType === "speaker") {
      return { ...row, isActive: row.isActive === 1 };
    }
    return row;
  }

  async findCurrentRevisionId(contentId: string, version: number) {
    const row = await this.database
      .prepare(
        `SELECT id FROM content_revisions
         WHERE content_id = ?1 AND version = ?2`,
      )
      .bind(contentId, version)
      .first<{ id: string }>();
    return row?.id ?? null;
  }

  async submit(record: SubmitContentRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO content_revisions
            (id, content_id, version, snapshot_json, change_summary, created_by, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(
          record.revisionId,
          record.content.id,
          record.content.version,
          record.snapshotJson,
          record.changeSummary,
          record.actorStaffId,
          record.createdAt,
        ),
      this.database
        .prepare(
          `UPDATE content_entries
           SET status = 'pending_review', submitted_by = ?2, submitted_at = ?3,
               approved_by = NULL, approved_at = NULL, updated_by = ?2, updated_at = ?3
           WHERE id = ?1 AND status = 'draft' AND version = ?4`,
        )
        .bind(
          record.content.id,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.reviewEventStatement(record, "submitted", record.revisionId, false),
      this.auditStatement(record, "content.submitted", record.content.id, {
        contentType: record.content.contentType,
        version: record.content.version,
      }),
    ]);
  }

  async approve(record: ReviewContentRecord & { isSelfApproval: boolean }) {
    if (!record.revisionId) throw new Error("Approval requires a revision.");
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE content_entries
           SET status = 'approved', approved_by = ?2, approved_at = ?3,
               updated_by = ?2, updated_at = ?3
           WHERE id = ?1 AND status = 'pending_review' AND version = ?4`,
        )
        .bind(
          record.content.id,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.reviewEventStatement(
        record,
        "approved",
        record.revisionId,
        record.isSelfApproval,
      ),
      this.auditStatement(record, "content.approved", record.content.id, {
        contentType: record.content.contentType,
        version: record.content.version,
        selfApproval: record.isSelfApproval,
      }),
    ]);
  }

  async requestChanges(record: ReviewContentRecord) {
    if (!record.revisionId) throw new Error("A revision is required.");
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE content_entries
           SET status = 'draft', version = version + 1,
               submitted_by = NULL, submitted_at = NULL,
               approved_by = NULL, approved_at = NULL,
               updated_by = ?2, updated_at = ?3
           WHERE id = ?1 AND status = 'pending_review' AND version = ?4`,
        )
        .bind(
          record.content.id,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.changedRowReviewEventStatement(
        record,
        "changes_requested",
        record.revisionId,
      ),
      this.changedRowAuditStatement(
        record,
        "content.changes_requested",
        record.content.id,
        {
          contentType: record.content.contentType,
          version: record.content.version,
          reason: record.reason,
        },
      ),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("Content state changed before changes were requested.");
    }
    return record.content.version + 1;
  }

  async publish(record: ReviewContentRecord) {
    if (!record.revisionId) throw new Error("Publication requires a revision.");
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE content_entries
           SET status = 'published', published_by = ?2, published_at = ?3,
               updated_by = ?2, updated_at = ?3
           WHERE id = ?1 AND status = 'approved' AND version = ?4`,
        )
        .bind(
          record.content.id,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.reviewEventStatement(record, "published", record.revisionId, false),
      this.auditStatement(record, "content.published", record.content.id, {
        contentType: record.content.contentType,
        version: record.content.version,
      }),
    ]);
  }

  async archive(record: ReviewContentRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE content_entries
           SET status = 'archived', archived_by = ?2, archived_at = ?3,
               updated_by = ?2, updated_at = ?3
           WHERE id = ?1 AND status <> 'archived' AND version = ?4`,
        )
        .bind(
          record.content.id,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.changedRowReviewEventStatement(
        record,
        "archived",
        record.revisionId,
      ),
      this.changedRowAuditStatement(
        record,
        "content.archived",
        record.content.id,
        {
          contentType: record.content.contentType,
          version: record.content.version,
          reason: record.reason,
        },
      ),
    ]);
    if (mutation.meta.changes !== 1)
      throw new Error("Content state changed before archive.");
  }

  private reviewEventStatement(
    record: ReviewContentRecord | SubmitContentRecord,
    action: "submitted" | "approved" | "published",
    revisionId: string,
    selfApproval: boolean,
  ) {
    return this.database
      .prepare(
        `INSERT INTO content_review_events
          (id, content_id, revision_id, action, actor_staff_id,
           is_self_approval, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        record.reviewEventId,
        record.content.id,
        revisionId,
        action,
        record.actorStaffId,
        selfApproval ? 1 : 0,
        "reason" in record ? record.reason : null,
        record.createdAt,
      );
  }

  private changedRowReviewEventStatement(
    record: ReviewContentRecord,
    action: "archived" | "changes_requested",
    revisionId: string | null,
  ) {
    return this.database
      .prepare(
        `INSERT INTO content_review_events
          (id, content_id, revision_id, action, actor_staff_id,
           is_self_approval, reason, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, 0, ?6, ?7 WHERE changes() = 1`,
      )
      .bind(
        record.reviewEventId,
        record.content.id,
        revisionId,
        action,
        record.actorStaffId,
        record.reason,
        record.createdAt,
      );
  }

  private auditStatement(
    record: MutationIdentity,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
          (id, actor_staff_id, actor_type, action, resource_type, resource_id,
           sensitivity, metadata_json, correlation_id, created_at)
         VALUES (?1, ?2, 'staff', ?3, 'content_entry', ?4,
                 'standard', ?5, ?6, ?7)`,
      )
      .bind(
        record.auditLogId,
        record.actorStaffId,
        action,
        resourceId,
        JSON.stringify(metadata),
        record.correlationId,
        record.createdAt,
      );
  }

  private changedRowAuditStatement(
    record: MutationIdentity,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
          (id, actor_staff_id, actor_type, action, resource_type, resource_id,
           sensitivity, metadata_json, correlation_id, created_at)
         SELECT ?1, ?2, 'staff', ?3, 'content_entry', ?4,
                'standard', ?5, ?6, ?7 WHERE changes() = 1`,
      )
      .bind(
        record.auditLogId,
        record.actorStaffId,
        action,
        resourceId,
        JSON.stringify(metadata),
        record.correlationId,
        record.createdAt,
      );
  }
}
