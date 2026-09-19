import type { ContentEntry, ContentStatus, ContentType } from "./repository";

export type MediaAssetReference = {
  id: string;
  storageScope: "public_content" | "bulletins";
  mimeType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/avif"
    | "application/pdf";
  uploadStatus: "pending" | "ready" | "quarantined" | "deleted";
};

export type MinistrySubtype = {
  contentType: "ministry";
  shortName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sortOrder: number;
};

export type SeriesSubtype = {
  contentType: "series";
  startsOn: string | null;
  endsOn: string | null;
};

export type SpeakerSubtype = {
  contentType: "speaker";
  biography: string | null;
  photoMediaId: string | null;
  isActive: boolean;
};

export type SermonSubtype = {
  contentType: "sermon";
  seriesContentId: string | null;
  speakerContentId: string | null;
  preachedAt: string;
  scriptureReference: string | null;
  videoProvider: "facebook" | "youtube";
  videoUrl: string;
  durationSeconds: number | null;
};

export type AnnouncementSubtype = {
  contentType: "announcement";
  visibleFrom: string | null;
  visibleUntil: string | null;
  priority: number;
};

export type BulletinSubtype = {
  contentType: "bulletin";
  issueDate: string;
  fileMediaId: string;
  editionLabel: string | null;
};

export type ScheduleSubtype = {
  contentType: "schedule";
  activityType:
    | "daily_activity"
    | "service"
    | "cell_group"
    | "discipleship"
    | "prayer_meeting"
    | "ministry_meeting"
    | "outreach"
    | "special_event";
  ministryContentId: string | null;
  startsAt: string;
  endsAt: string;
  timezone: "Asia/Manila";
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationVisibility:
    "public_exact" | "public_area" | "contact_required" | "staff_only";
  contactEmail: string | null;
  contactPhone: string | null;
  registrationUrl: string | null;
};

export type ContentSubtype =
  | MinistrySubtype
  | SeriesSubtype
  | SpeakerSubtype
  | SermonSubtype
  | AnnouncementSubtype
  | BulletinSubtype
  | ScheduleSubtype;

type MutationIdentity = {
  actorStaffId: string;
  auditLogId: string;
  correlationId: string;
  createdAt: string;
};

export type SaveContentSubtypeRecord = MutationIdentity & {
  content: ContentEntry;
  subtype: ContentSubtype;
};

export type ScheduleExceptionRecord = MutationIdentity & {
  exceptionId: string;
  scheduleContentId: string;
  occurrenceDate: string;
  action: "cancelled" | "rescheduled";
  replacementStartsAt: string | null;
  replacementEndsAt: string | null;
  publicNote: string | null;
};

export interface ContentSubtypeRepositoryPort {
  findContent(contentId: string): Promise<ContentEntry | null>;
  contentReferenceExists(
    contentType: ContentType,
    contentId: string,
  ): Promise<boolean>;
  findMediaAsset(mediaId: string): Promise<MediaAssetReference | null>;
  saveSubtype(record: SaveContentSubtypeRecord): Promise<number>;
  saveScheduleException(record: ScheduleExceptionRecord): Promise<void>;
  findScheduleStatus(contentId: string): Promise<ContentStatus | null>;
}

type MediaAssetRow = {
  id: string;
  storage_scope: MediaAssetReference["storageScope"];
  mime_type: MediaAssetReference["mimeType"];
  upload_status: MediaAssetReference["uploadStatus"];
};

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

function mapContent(row: ContentRow): ContentEntry {
  const body: unknown = JSON.parse(row.body_json);
  if (
    typeof body !== "object" ||
    body === null ||
    !("format" in body) ||
    body.format !== "plain_text" ||
    !("text" in body) ||
    typeof body.text !== "string"
  ) {
    throw new Error("Stored content body has an unsupported format.");
  }
  return {
    id: row.id,
    contentType: row.content_type,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: { format: "plain_text", text: body.text },
    coverMediaId: row.cover_media_id,
    status: row.status,
    version: row.version,
    createdBy: row.created_by,
    submittedBy: row.submitted_by,
  };
}

export class ContentSubtypeRepository implements ContentSubtypeRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async findContent(contentId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, content_type, slug, title, summary, body_json,
                cover_media_id, status, version, created_by, submitted_by
         FROM content_entries WHERE id = ?1`,
      )
      .bind(contentId)
      .first<ContentRow>();
    return row ? mapContent(row) : null;
  }

  async contentReferenceExists(contentType: ContentType, contentId: string) {
    const row = await this.database
      .prepare(
        `SELECT EXISTS (
           SELECT 1 FROM content_entries
           WHERE id = ?1 AND content_type = ?2 AND status <> 'archived'
         ) AS found`,
      )
      .bind(contentId, contentType)
      .first<{ found: number }>();
    return row?.found === 1;
  }

  async findMediaAsset(mediaId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, storage_scope, mime_type, upload_status
         FROM media_assets WHERE id = ?1`,
      )
      .bind(mediaId)
      .first<MediaAssetRow>();
    if (!row) return null;
    return {
      id: row.id,
      storageScope: row.storage_scope,
      mimeType: row.mime_type,
      uploadStatus: row.upload_status,
    };
  }

  async findScheduleStatus(contentId: string) {
    const row = await this.database
      .prepare(
        `SELECT content.status FROM content_entries AS content
         JOIN schedule_items AS schedule ON schedule.content_id = content.id
         WHERE content.id = ?1 AND content.content_type = 'schedule'`,
      )
      .bind(contentId)
      .first<{ status: ContentStatus }>();
    return row?.status ?? null;
  }

  async saveSubtype(record: SaveContentSubtypeRecord) {
    const subtypeStatement = this.subtypeStatement(record);
    const [subtypeMutation, contentMutation] = await this.database.batch([
      subtypeStatement,
      this.database
        .prepare(
          `UPDATE content_entries
           SET version = version + 1, updated_by = ?3, updated_at = ?4
           WHERE id = ?1 AND content_type = ?2 AND status = 'draft'
             AND version = ?5 AND changes() = 1`,
        )
        .bind(
          record.content.id,
          record.content.contentType,
          record.actorStaffId,
          record.createdAt,
          record.content.version,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_logs
            (id, actor_staff_id, actor_type, action, resource_type, resource_id,
             sensitivity, metadata_json, correlation_id, created_at)
           SELECT ?1, ?2, 'staff', 'content.subtype_updated', 'content_entry',
                  ?3, 'standard', ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(
          record.auditLogId,
          record.actorStaffId,
          record.content.id,
          JSON.stringify({
            contentType: record.content.contentType,
            version: record.content.version + 1,
          }),
          record.correlationId,
          record.createdAt,
        ),
    ]);
    if (
      subtypeMutation.meta.changes !== 1 ||
      contentMutation.meta.changes !== 1
    ) {
      throw new Error("Content changed before its details were saved.");
    }
    return record.content.version + 1;
  }

  async saveScheduleException(record: ScheduleExceptionRecord) {
    const [mutation] = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO schedule_exceptions
            (id, schedule_content_id, occurrence_date, action,
             replacement_starts_at, replacement_ends_at, public_note,
             created_by, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
           ON CONFLICT(schedule_content_id, occurrence_date) DO UPDATE SET
             action = excluded.action,
             replacement_starts_at = excluded.replacement_starts_at,
             replacement_ends_at = excluded.replacement_ends_at,
             public_note = excluded.public_note,
             created_by = excluded.created_by,
             created_at = excluded.created_at`,
        )
        .bind(
          record.exceptionId,
          record.scheduleContentId,
          record.occurrenceDate,
          record.action,
          record.replacementStartsAt,
          record.replacementEndsAt,
          record.publicNote,
          record.actorStaffId,
          record.createdAt,
        ),
      this.database
        .prepare(
          `INSERT INTO audit_logs
            (id, actor_staff_id, actor_type, action, resource_type, resource_id,
             sensitivity, metadata_json, correlation_id, created_at)
           SELECT ?1, ?2, 'staff', 'schedule.exception_saved',
                  'content_entry', ?3, 'standard', ?4, ?5, ?6
           WHERE changes() = 1`,
        )
        .bind(
          record.auditLogId,
          record.actorStaffId,
          record.scheduleContentId,
          JSON.stringify({
            occurrenceDate: record.occurrenceDate,
            action: record.action,
          }),
          record.correlationId,
          record.createdAt,
        ),
    ]);
    if (mutation.meta.changes !== 1) {
      throw new Error("The schedule exception could not be saved.");
    }
  }

  private subtypeStatement(record: SaveContentSubtypeRecord) {
    const commonGuard = `SELECT ?1`;
    const subtype = record.subtype;
    switch (subtype.contentType) {
      case "ministry":
        return this.database
          .prepare(
            `INSERT INTO ministries
              (content_id, short_name, contact_email, contact_phone, sort_order)
             ${commonGuard}, ?2, ?3, ?4, ?5 FROM content_entries
             WHERE id = ?1 AND content_type = 'ministry' AND status = 'draft'
               AND version = ?6
             ON CONFLICT(content_id) DO UPDATE SET
               short_name = excluded.short_name,
               contact_email = excluded.contact_email,
               contact_phone = excluded.contact_phone,
               sort_order = excluded.sort_order`,
          )
          .bind(
            record.content.id,
            subtype.shortName,
            subtype.contactEmail,
            subtype.contactPhone,
            subtype.sortOrder,
            record.content.version,
          );
      case "series":
        return this.database
          .prepare(
            `INSERT INTO sermon_series (content_id, starts_on, ends_on)
             ${commonGuard}, ?2, ?3 FROM content_entries
             WHERE id = ?1 AND content_type = 'series' AND status = 'draft'
               AND version = ?4
             ON CONFLICT(content_id) DO UPDATE SET
               starts_on = excluded.starts_on, ends_on = excluded.ends_on`,
          )
          .bind(
            record.content.id,
            subtype.startsOn,
            subtype.endsOn,
            record.content.version,
          );
      case "speaker":
        return this.database
          .prepare(
            `INSERT INTO speakers
              (content_id, biography, photo_media_id, is_active)
             ${commonGuard}, ?2, ?3, ?4 FROM content_entries
             WHERE id = ?1 AND content_type = 'speaker' AND status = 'draft'
               AND version = ?5
             ON CONFLICT(content_id) DO UPDATE SET
               biography = excluded.biography,
               photo_media_id = excluded.photo_media_id,
               is_active = excluded.is_active`,
          )
          .bind(
            record.content.id,
            subtype.biography,
            subtype.photoMediaId,
            subtype.isActive ? 1 : 0,
            record.content.version,
          );
      case "sermon":
        return this.database
          .prepare(
            `INSERT INTO sermons
              (content_id, series_content_id, speaker_content_id, preached_at,
               scripture_reference, video_provider, video_url, duration_seconds)
             ${commonGuard}, ?2, ?3, ?4, ?5, ?6, ?7, ?8 FROM content_entries
             WHERE id = ?1 AND content_type = 'sermon' AND status = 'draft'
               AND version = ?9
             ON CONFLICT(content_id) DO UPDATE SET
               series_content_id = excluded.series_content_id,
               speaker_content_id = excluded.speaker_content_id,
               preached_at = excluded.preached_at,
               scripture_reference = excluded.scripture_reference,
               video_provider = excluded.video_provider,
               video_url = excluded.video_url,
               duration_seconds = excluded.duration_seconds`,
          )
          .bind(
            record.content.id,
            subtype.seriesContentId,
            subtype.speakerContentId,
            subtype.preachedAt,
            subtype.scriptureReference,
            subtype.videoProvider,
            subtype.videoUrl,
            subtype.durationSeconds,
            record.content.version,
          );
      case "announcement":
        return this.database
          .prepare(
            `INSERT INTO announcements
              (content_id, visible_from, visible_until, priority)
             ${commonGuard}, ?2, ?3, ?4 FROM content_entries
             WHERE id = ?1 AND content_type = 'announcement'
               AND status = 'draft' AND version = ?5
             ON CONFLICT(content_id) DO UPDATE SET
               visible_from = excluded.visible_from,
               visible_until = excluded.visible_until,
               priority = excluded.priority`,
          )
          .bind(
            record.content.id,
            subtype.visibleFrom,
            subtype.visibleUntil,
            subtype.priority,
            record.content.version,
          );
      case "bulletin":
        return this.database
          .prepare(
            `INSERT INTO bulletins
              (content_id, issue_date, file_media_id, edition_label)
             ${commonGuard}, ?2, ?3, ?4 FROM content_entries
             WHERE id = ?1 AND content_type = 'bulletin' AND status = 'draft'
               AND version = ?5
             ON CONFLICT(content_id) DO UPDATE SET
               issue_date = excluded.issue_date,
               file_media_id = excluded.file_media_id,
               edition_label = excluded.edition_label`,
          )
          .bind(
            record.content.id,
            subtype.issueDate,
            subtype.fileMediaId,
            subtype.editionLabel,
            record.content.version,
          );
      case "schedule":
        return this.database
          .prepare(
            `INSERT INTO schedule_items
              (content_id, activity_type, ministry_content_id, starts_at,
               ends_at, timezone, recurrence_rule, recurrence_until,
               location_name, location_address, location_visibility,
               contact_email, contact_phone, registration_url)
             ${commonGuard}, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
                    ?12, ?13, ?14 FROM content_entries
             WHERE id = ?1 AND content_type = 'schedule' AND status = 'draft'
               AND version = ?15
             ON CONFLICT(content_id) DO UPDATE SET
               activity_type = excluded.activity_type,
               ministry_content_id = excluded.ministry_content_id,
               starts_at = excluded.starts_at,
               ends_at = excluded.ends_at,
               timezone = excluded.timezone,
               recurrence_rule = excluded.recurrence_rule,
               recurrence_until = excluded.recurrence_until,
               location_name = excluded.location_name,
               location_address = excluded.location_address,
               location_visibility = excluded.location_visibility,
               contact_email = excluded.contact_email,
               contact_phone = excluded.contact_phone,
               registration_url = excluded.registration_url`,
          )
          .bind(
            record.content.id,
            subtype.activityType,
            subtype.ministryContentId,
            subtype.startsAt,
            subtype.endsAt,
            subtype.timezone,
            subtype.recurrenceRule,
            subtype.recurrenceUntil,
            subtype.locationName,
            subtype.locationAddress,
            subtype.locationVisibility,
            subtype.contactEmail,
            subtype.contactPhone,
            subtype.registrationUrl,
            record.content.version,
          );
    }
  }
}
