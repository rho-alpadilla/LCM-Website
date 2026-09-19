import type { ContentBody } from "./repository";

import type { PublicImage } from "@/shared/media/types";

export type { PublicImage } from "@/shared/media/types";

export type PublicContentBase = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: ContentBody;
  coverImage: PublicImage | null;
  publishedAt: string;
};

export type PublicMinistry = PublicContentBase & {
  shortName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type PublicSermon = PublicContentBase & {
  preachedAt: string;
  scriptureReference: string | null;
  videoProvider: "facebook" | "youtube";
  videoUrl: string;
  durationSeconds: number | null;
  seriesTitle: string | null;
  speakerName: string | null;
};

export type PublicAnnouncement = PublicContentBase & {
  priority: number;
  visibleFrom: string | null;
  visibleUntil: string | null;
};

export type PublicBulletin = PublicContentBase & {
  issueDate: string;
  editionLabel: string | null;
  fileMediaId: string;
};

export type PublicLocation = {
  label: string;
  address: string | null;
  access: "exact" | "area_only" | "contact_required" | "staff_only";
};

export type PublicScheduleException = {
  occurrenceDate: string;
  action: "cancelled" | "rescheduled";
  replacementStartsAt: string | null;
  replacementEndsAt: string | null;
  publicNote: string | null;
};

export type PublicActivity = PublicContentBase & {
  activityType:
    | "daily_activity"
    | "service"
    | "cell_group"
    | "discipleship"
    | "prayer_meeting"
    | "ministry_meeting"
    | "outreach"
    | "special_event";
  ministryName: string | null;
  startsAt: string;
  endsAt: string;
  timezone: "Asia/Manila";
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
  location: PublicLocation;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationUrl: string | null;
  exceptions: PublicScheduleException[];
};

export type PublicMediaDelivery = {
  objectKey: string;
  originalName: string;
  mimeType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/avif"
    | "application/pdf";
  sizeBytes: number;
};

export interface PublicContentRepositoryPort {
  listMinistries(): Promise<PublicMinistry[]>;
  findMinistryBySlug(slug: string): Promise<PublicMinistry | null>;
  listSermons(): Promise<PublicSermon[]>;
  findSermonBySlug(slug: string): Promise<PublicSermon | null>;
  listAnnouncements(now: string): Promise<PublicAnnouncement[]>;
  findAnnouncementBySlug(
    slug: string,
    now: string,
  ): Promise<PublicAnnouncement | null>;
  listBulletins(): Promise<PublicBulletin[]>;
  listActivities(): Promise<PublicActivity[]>;
  findPublicMedia(mediaId: string): Promise<PublicMediaDelivery | null>;
}

type BaseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_json: string;
  cover_media_id: string | null;
  cover_alt_text: string | null;
  cover_is_decorative: number | null;
  published_at: string;
};

type MinistryRow = BaseRow & {
  short_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type SermonRow = BaseRow & {
  preached_at: string;
  scripture_reference: string | null;
  video_provider: PublicSermon["videoProvider"];
  video_url: string;
  duration_seconds: number | null;
  series_title: string | null;
  speaker_name: string | null;
};

type AnnouncementRow = BaseRow & {
  priority: number;
  visible_from: string | null;
  visible_until: string | null;
};

type BulletinRow = BaseRow & {
  issue_date: string;
  edition_label: string | null;
  file_media_id: string;
};

type ActivityRow = BaseRow & {
  activity_type: PublicActivity["activityType"];
  ministry_name: string | null;
  starts_at: string;
  ends_at: string;
  timezone: "Asia/Manila";
  recurrence_rule: string | null;
  recurrence_until: string | null;
  location_name: string | null;
  location_address: string | null;
  location_visibility:
    "public_exact" | "public_area" | "contact_required" | "staff_only";
  contact_email: string | null;
  contact_phone: string | null;
  registration_url: string | null;
  exception_date: string | null;
  exception_action: PublicScheduleException["action"] | null;
  replacement_starts_at: string | null;
  replacement_ends_at: string | null;
  public_note: string | null;
};

type MediaRow = {
  object_key: string;
  original_name: string;
  mime_type: PublicMediaDelivery["mimeType"];
  size_bytes: number;
};

const baseSelect = `
  content.id, content.slug, content.title, content.summary, content.body_json,
  cover.id AS cover_media_id, cover.alt_text AS cover_alt_text,
  cover.is_decorative AS cover_is_decorative, content.published_at`;

const coverJoin = `
  LEFT JOIN media_assets AS cover
    ON cover.id = content.cover_media_id
   AND cover.storage_scope = 'public_content'
   AND cover.mime_type LIKE 'image/%'
   AND cover.upload_status = 'ready'`;

function parseBody(value: string): ContentBody {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("format" in parsed) ||
    parsed.format !== "plain_text" ||
    !("text" in parsed) ||
    typeof parsed.text !== "string"
  ) {
    throw new Error("Stored public content body has an unsupported format.");
  }
  return { format: "plain_text", text: parsed.text };
}

function mapBase(row: BaseRow): PublicContentBase {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: parseBody(row.body_json),
    coverImage: row.cover_media_id
      ? {
          id: row.cover_media_id,
          altText: row.cover_alt_text,
          isDecorative: row.cover_is_decorative === 1,
        }
      : null,
    publishedAt: row.published_at,
  };
}

export function redactPublicLocation(
  visibility: ActivityRow["location_visibility"],
  name: string | null,
  address: string | null,
): PublicLocation {
  switch (visibility) {
    case "public_exact":
      return { label: name || "Location available", address, access: "exact" };
    case "public_area":
      return {
        label: name || "General area available",
        address: null,
        access: "area_only",
      };
    case "contact_required":
      return {
        label: "Contact the church for the location",
        address: null,
        access: "contact_required",
      };
    case "staff_only":
      return {
        label: "Private ministry location",
        address: null,
        access: "staff_only",
      };
  }
}

export function redactPublicScheduleLinks(
  visibility: ActivityRow["location_visibility"],
  contactEmail: string | null,
  contactPhone: string | null,
  registrationUrl: string | null,
) {
  if (visibility === "staff_only") {
    return { contactEmail: null, contactPhone: null, registrationUrl: null };
  }
  return {
    contactEmail,
    contactPhone,
    registrationUrl: visibility === "contact_required" ? null : registrationUrl,
  };
}

export class PublicContentRepository implements PublicContentRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async listMinistries() {
    const result = await this.database
      .prepare(
        `SELECT ${baseSelect}, ministry.short_name, ministry.contact_email,
                ministry.contact_phone
         FROM content_entries AS content
         JOIN ministries AS ministry ON ministry.content_id = content.id
         ${coverJoin}
         WHERE content.content_type = 'ministry' AND content.status = 'published'
         ORDER BY ministry.sort_order, content.title COLLATE NOCASE
         LIMIT 200`,
      )
      .all<MinistryRow>();
    return result.results.map(mapMinistry);
  }

  async findMinistryBySlug(slug: string) {
    const row = await this.database
      .prepare(
        `SELECT ${baseSelect}, ministry.short_name, ministry.contact_email,
                ministry.contact_phone
         FROM content_entries AS content
         JOIN ministries AS ministry ON ministry.content_id = content.id
         ${coverJoin}
         WHERE content.content_type = 'ministry' AND content.status = 'published'
           AND content.slug = ?1`,
      )
      .bind(slug)
      .first<MinistryRow>();
    return row ? mapMinistry(row) : null;
  }

  async listSermons() {
    const result = await this.database
      .prepare(
        `SELECT ${baseSelect}, sermon.preached_at, sermon.scripture_reference,
                sermon.video_provider, sermon.video_url, sermon.duration_seconds,
                series_content.title AS series_title,
                speaker_content.title AS speaker_name
         FROM content_entries AS content
         JOIN sermons AS sermon ON sermon.content_id = content.id
         ${coverJoin}
         LEFT JOIN content_entries AS series_content
           ON series_content.id = sermon.series_content_id
          AND series_content.content_type = 'series'
          AND series_content.status = 'published'
         LEFT JOIN content_entries AS speaker_content
           ON speaker_content.id = sermon.speaker_content_id
          AND speaker_content.content_type = 'speaker'
          AND speaker_content.status = 'published'
         WHERE content.content_type = 'sermon' AND content.status = 'published'
         ORDER BY datetime(sermon.preached_at) DESC, content.title COLLATE NOCASE
         LIMIT 200`,
      )
      .all<SermonRow>();
    return result.results.map(mapSermon);
  }

  async findSermonBySlug(slug: string) {
    const row = await this.database
      .prepare(
        `SELECT ${baseSelect}, sermon.preached_at, sermon.scripture_reference,
                sermon.video_provider, sermon.video_url, sermon.duration_seconds,
                series_content.title AS series_title,
                speaker_content.title AS speaker_name
         FROM content_entries AS content
         JOIN sermons AS sermon ON sermon.content_id = content.id
         ${coverJoin}
         LEFT JOIN content_entries AS series_content
           ON series_content.id = sermon.series_content_id
          AND series_content.content_type = 'series'
          AND series_content.status = 'published'
         LEFT JOIN content_entries AS speaker_content
           ON speaker_content.id = sermon.speaker_content_id
          AND speaker_content.content_type = 'speaker'
          AND speaker_content.status = 'published'
         WHERE content.content_type = 'sermon' AND content.status = 'published'
           AND content.slug = ?1`,
      )
      .bind(slug)
      .first<SermonRow>();
    return row ? mapSermon(row) : null;
  }

  async listAnnouncements(now: string) {
    const result = await this.database
      .prepare(
        `SELECT ${baseSelect}, announcement.priority, announcement.visible_from,
                announcement.visible_until
         FROM content_entries AS content
         JOIN announcements AS announcement ON announcement.content_id = content.id
         ${coverJoin}
         WHERE content.content_type = 'announcement'
           AND content.status = 'published'
           AND (announcement.visible_from IS NULL
                OR datetime(announcement.visible_from) <= datetime(?1))
           AND (announcement.visible_until IS NULL
                OR datetime(announcement.visible_until) > datetime(?1))
         ORDER BY announcement.priority DESC, datetime(content.published_at) DESC
         LIMIT 100`,
      )
      .bind(now)
      .all<AnnouncementRow>();
    return result.results.map(mapAnnouncement);
  }

  async findAnnouncementBySlug(slug: string, now: string) {
    const row = await this.database
      .prepare(
        `SELECT ${baseSelect}, announcement.priority, announcement.visible_from,
                announcement.visible_until
         FROM content_entries AS content
         JOIN announcements AS announcement ON announcement.content_id = content.id
         ${coverJoin}
         WHERE content.content_type = 'announcement'
           AND content.status = 'published' AND content.slug = ?1
           AND (announcement.visible_from IS NULL
                OR datetime(announcement.visible_from) <= datetime(?2))
           AND (announcement.visible_until IS NULL
                OR datetime(announcement.visible_until) > datetime(?2))`,
      )
      .bind(slug, now)
      .first<AnnouncementRow>();
    return row ? mapAnnouncement(row) : null;
  }

  async listBulletins() {
    const result = await this.database
      .prepare(
        `SELECT ${baseSelect}, bulletin.issue_date, bulletin.edition_label,
                bulletin.file_media_id
         FROM content_entries AS content
         JOIN bulletins AS bulletin ON bulletin.content_id = content.id
         JOIN media_assets AS file ON file.id = bulletin.file_media_id
           AND file.storage_scope = 'bulletins'
           AND file.mime_type = 'application/pdf'
           AND file.upload_status = 'ready'
         ${coverJoin}
         WHERE content.content_type = 'bulletin' AND content.status = 'published'
         ORDER BY bulletin.issue_date DESC, content.title COLLATE NOCASE
         LIMIT 200`,
      )
      .all<BulletinRow>();
    return result.results.map((row) => ({
      ...mapBase(row),
      issueDate: row.issue_date,
      editionLabel: row.edition_label,
      fileMediaId: row.file_media_id,
    }));
  }

  async listActivities() {
    const result = await this.database
      .prepare(
        `SELECT ${baseSelect}, schedule.activity_type,
                ministry_content.title AS ministry_name,
                schedule.starts_at, schedule.ends_at, schedule.timezone,
                schedule.recurrence_rule, schedule.recurrence_until,
                schedule.location_name, schedule.location_address,
                schedule.location_visibility, schedule.contact_email,
                schedule.contact_phone, schedule.registration_url,
                exception.occurrence_date AS exception_date,
                exception.action AS exception_action,
                exception.replacement_starts_at, exception.replacement_ends_at,
                exception.public_note
         FROM content_entries AS content
         JOIN schedule_items AS schedule ON schedule.content_id = content.id
         ${coverJoin}
         LEFT JOIN content_entries AS ministry_content
           ON ministry_content.id = schedule.ministry_content_id
          AND ministry_content.content_type = 'ministry'
          AND ministry_content.status = 'published'
         LEFT JOIN schedule_exceptions AS exception
           ON exception.schedule_content_id = content.id
         WHERE content.content_type = 'schedule' AND content.status = 'published'
         ORDER BY datetime(schedule.starts_at), content.title COLLATE NOCASE,
                  exception.occurrence_date
         LIMIT 500`,
      )
      .all<ActivityRow>();

    const activities = new Map<string, PublicActivity>();
    for (const row of result.results) {
      let activity = activities.get(row.id);
      if (!activity) {
        const publicLinks = redactPublicScheduleLinks(
          row.location_visibility,
          row.contact_email,
          row.contact_phone,
          row.registration_url,
        );
        activity = {
          ...mapBase(row),
          activityType: row.activity_type,
          ministryName: row.ministry_name,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          timezone: row.timezone,
          recurrenceRule: row.recurrence_rule,
          recurrenceUntil: row.recurrence_until,
          location: redactPublicLocation(
            row.location_visibility,
            row.location_name,
            row.location_address,
          ),
          ...publicLinks,
          exceptions: [],
        };
        activities.set(row.id, activity);
      }
      if (row.exception_date && row.exception_action) {
        activity.exceptions.push({
          occurrenceDate: row.exception_date,
          action: row.exception_action,
          replacementStartsAt: row.replacement_starts_at,
          replacementEndsAt: row.replacement_ends_at,
          publicNote: row.public_note,
        });
      }
    }
    return [...activities.values()];
  }

  async findPublicMedia(mediaId: string) {
    const row = await this.database
      .prepare(
        `SELECT media.object_key, media.original_name, media.mime_type,
                media.size_bytes
         FROM media_assets AS media
         WHERE media.id = ?1 AND media.upload_status = 'ready'
           AND (
             (media.storage_scope = 'public_content'
              AND media.mime_type LIKE 'image/%'
              AND (
                EXISTS (
                  SELECT 1 FROM content_entries AS content
                  WHERE content.status = 'published'
                    AND content.cover_media_id = media.id
                )
                OR EXISTS (
                  SELECT 1 FROM speakers AS speaker
                  JOIN content_entries AS content ON content.id = speaker.content_id
                  WHERE content.status = 'published'
                    AND content.content_type = 'speaker'
                    AND speaker.photo_media_id = media.id
                )
              ))
             OR
             (media.storage_scope = 'bulletins'
              AND media.mime_type = 'application/pdf'
              AND EXISTS (
                SELECT 1 FROM bulletins AS bulletin
                JOIN content_entries AS content ON content.id = bulletin.content_id
                WHERE content.status = 'published'
                  AND content.content_type = 'bulletin'
                  AND bulletin.file_media_id = media.id
              ))
           )`,
      )
      .bind(mediaId)
      .first<MediaRow>();
    return row
      ? {
          objectKey: row.object_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
        }
      : null;
  }
}

function mapMinistry(row: MinistryRow): PublicMinistry {
  return {
    ...mapBase(row),
    shortName: row.short_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}

function mapSermon(row: SermonRow): PublicSermon {
  return {
    ...mapBase(row),
    preachedAt: row.preached_at,
    scriptureReference: row.scripture_reference,
    videoProvider: row.video_provider,
    videoUrl: row.video_url,
    durationSeconds: row.duration_seconds,
    seriesTitle: row.series_title,
    speakerName: row.speaker_name,
  };
}

function mapAnnouncement(row: AnnouncementRow): PublicAnnouncement {
  return {
    ...mapBase(row),
    priority: row.priority,
    visibleFrom: row.visible_from,
    visibleUntil: row.visible_until,
  };
}
