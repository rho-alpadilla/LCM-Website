export type PrayerPrivacyScope = "team" | "pastoral_only";
export type PrayerStatus =
  | "open"
  | "in_prayer"
  | "follow_up"
  | "escalated"
  | "closed"
  | "retention_review";

export type PrayerRequestRecord = {
  id: string;
  requestText: string | null;
  privacyScope: PrayerPrivacyScope;
  status: PrayerStatus;
  submittedAt: string;
  legalHold: boolean;
  closedAt: string | null;
  contactRetentionDueAt: string | null;
  contentRetentionDueAt: string | null;
};

export type PrayerQueueItem = Pick<
  PrayerRequestRecord,
  "id" | "privacyScope" | "status" | "submittedAt"
> & { assignedToCurrentActor: boolean };

export type PrayerUpdateRecord = {
  id: string;
  updateType: "prayed" | "note" | "follow_up" | "escalated" | "closed";
  note: string | null;
  visibilityScope: PrayerPrivacyScope;
  createdByName: string;
  createdAt: string;
};

export type PrayerAssignmentView = {
  id: string;
  assignedTo: string;
  assignedToName: string;
  assignedAt: string;
};

export type PrayerAssignee = { id: string; displayName: string };

export type PrayerContactRecord = {
  prayerRequestId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferredContact: "none" | "email" | "phone";
  followUpConsent: boolean;
  deletedAt: string | null;
};

export type CreatePrayerRecord = {
  requestId: string;
  requestText: string;
  privacyScope: PrayerPrivacyScope;
  source: "website" | "staff";
  createdBy: string | null;
  contact: Omit<PrayerContactRecord, "prayerRequestId" | "deletedAt"> | null;
  createdAt: string;
  auditLogId: string;
  correlationId: string;
};

export type PrayerMutationRecord = {
  requestId: string;
  actorStaffId: string;
  createdAt: string;
  auditLogId: string;
  correlationId: string;
};

export type PrayerAssignmentRecord = PrayerMutationRecord & {
  assignmentId: string;
  assignedTo: string;
};

export type AddPrayerUpdateRecord = PrayerMutationRecord & {
  updateId: string;
  updateType: PrayerUpdateRecord["updateType"];
  note: string | null;
  visibilityScope: PrayerPrivacyScope;
  nextStatus: PrayerStatus;
  increasePrivacy: boolean;
};

export type ClosePrayerRecord = PrayerMutationRecord & {
  updateId: string;
  note: string | null;
  visibilityScope: PrayerPrivacyScope;
  contactRetentionDueAt: string;
  contentRetentionDueAt: string;
};

export type PrayerRetentionCandidate = {
  id: string;
  deleteContact: boolean;
  deleteContent: boolean;
};

export interface PrayerRepositoryPort {
  create(record: CreatePrayerRecord): Promise<void>;
  listQueue(
    scopes: PrayerPrivacyScope[],
    actorStaffId: string,
  ): Promise<PrayerQueueItem[]>;
  findById(requestId: string): Promise<PrayerRequestRecord | null>;
  listUpdates(
    requestId: string,
    scopes: PrayerPrivacyScope[],
  ): Promise<PrayerUpdateRecord[]>;
  listAssignments(requestId: string): Promise<PrayerAssignmentView[]>;
  listEligibleAssignees(): Promise<PrayerAssignee[]>;
  isEligibleAssignee(staffId: string): Promise<boolean>;
  findContact(requestId: string): Promise<PrayerContactRecord | null>;
  recordSensitiveRead(
    record: PrayerMutationRecord,
    action: "prayer.detail_viewed" | "prayer.contact_revealed",
  ): Promise<void>;
  isActivelyAssigned(requestId: string, staffId: string): Promise<boolean>;
  assign(record: PrayerAssignmentRecord): Promise<void>;
  addUpdate(record: AddPrayerUpdateRecord): Promise<void>;
  close(record: ClosePrayerRecord): Promise<number>;
  findRetentionCandidates(
    now: string,
    limit: number,
  ): Promise<PrayerRetentionCandidate[]>;
  applyRetention(
    candidate: PrayerRetentionCandidate,
    now: string,
  ): Promise<void>;
}

type PrayerRow = {
  id: string;
  request_text: string | null;
  privacy_scope: PrayerPrivacyScope;
  status: PrayerStatus;
  legal_hold: number;
  closed_at: string | null;
  contact_retention_due_at: string | null;
  content_retention_due_at: string | null;
  submitted_at: string;
};

type ContactRow = {
  prayer_request_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: "none" | "email" | "phone";
  follow_up_consent: number;
  deleted_at: string | null;
};

type ExistsRow = { found: number };
type RetentionRow = {
  id: string;
  delete_contact: number;
  delete_content: number;
};
type QueueRow = {
  id: string;
  privacy_scope: PrayerPrivacyScope;
  status: PrayerStatus;
  submitted_at: string;
  assigned_to_actor: number;
};
type UpdateRow = {
  id: string;
  update_type: PrayerUpdateRecord["updateType"];
  note: string | null;
  visibility_scope: PrayerPrivacyScope;
  created_by_name: string;
  created_at: string;
};
type AssignmentRow = {
  id: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_at: string;
};
type AssigneeRow = { id: string; display_name: string };

export class PrayerRepository implements PrayerRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async create(record: CreatePrayerRecord) {
    const statements = [
      this.database
        .prepare(
          `INSERT INTO prayer_requests
          (id, request_text, privacy_scope, status, source, submitted_at, created_by, updated_at)
         VALUES (?1, ?2, ?3, 'open', ?4, ?5, ?6, ?5)`,
        )
        .bind(
          record.requestId,
          record.requestText,
          record.privacyScope,
          record.source,
          record.createdAt,
          record.createdBy,
        ),
    ];

    if (record.contact) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO prayer_request_contacts
            (prayer_request_id, name, email, phone, preferred_contact, follow_up_consent, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          )
          .bind(
            record.requestId,
            record.contact.name,
            record.contact.email,
            record.contact.phone,
            record.contact.preferredContact,
            record.contact.followUpConsent ? 1 : 0,
            record.createdAt,
          ),
      );
    }

    statements.push(
      this.auditStatement(record, "prayer.created", record.requestId, {
        privacyScope: record.privacyScope,
        source: record.source,
        hasContact: record.contact !== null,
      }),
    );
    await this.database.batch(statements);
  }

  async listQueue(scopes: PrayerPrivacyScope[], actorStaffId: string) {
    if (scopes.length === 0) return [];
    const placeholders = scopes.map((_, index) => `?${index + 2}`).join(", ");
    const rows = await this.database
      .prepare(
        `SELECT prayer_requests.id, prayer_requests.privacy_scope, prayer_requests.status,
                prayer_requests.submitted_at,
                EXISTS (SELECT 1 FROM prayer_assignments
                  WHERE prayer_assignments.prayer_request_id = prayer_requests.id
                    AND prayer_assignments.assigned_to = ?1
                    AND prayer_assignments.ended_at IS NULL) AS assigned_to_actor
         FROM prayer_requests
         WHERE prayer_requests.privacy_scope IN (${placeholders})
           AND prayer_requests.status NOT IN ('retention_review')
         ORDER BY CASE prayer_requests.status WHEN 'escalated' THEN 0 WHEN 'open' THEN 1
           WHEN 'follow_up' THEN 2 WHEN 'in_prayer' THEN 3 ELSE 4 END,
           prayer_requests.submitted_at ASC
         LIMIT 200`,
      )
      .bind(actorStaffId, ...scopes)
      .all<QueueRow>();
    return rows.results.map((row) => ({
      id: row.id,
      privacyScope: row.privacy_scope,
      status: row.status,
      submittedAt: row.submitted_at,
      assignedToCurrentActor: row.assigned_to_actor === 1,
    }));
  }

  async findById(requestId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, request_text, privacy_scope, status, submitted_at, legal_hold, closed_at,
              contact_retention_due_at, content_retention_due_at
       FROM prayer_requests WHERE id = ?1`,
      )
      .bind(requestId)
      .first<PrayerRow>();
    return row ? this.mapPrayer(row) : null;
  }

  async listUpdates(requestId: string, scopes: PrayerPrivacyScope[]) {
    if (scopes.length === 0) return [];
    const placeholders = scopes.map((_, index) => `?${index + 2}`).join(", ");
    const rows = await this.database
      .prepare(
        `SELECT prayer_updates.id, prayer_updates.update_type, prayer_updates.note,
                prayer_updates.visibility_scope, staff_profiles.display_name AS created_by_name,
                prayer_updates.created_at
         FROM prayer_updates
         JOIN staff_profiles ON staff_profiles.id = prayer_updates.created_by
         WHERE prayer_updates.prayer_request_id = ?1
           AND prayer_updates.visibility_scope IN (${placeholders})
         ORDER BY prayer_updates.created_at ASC`,
      )
      .bind(requestId, ...scopes)
      .all<UpdateRow>();
    return rows.results.map((row) => ({
      id: row.id,
      updateType: row.update_type,
      note: row.note,
      visibilityScope: row.visibility_scope,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    }));
  }

  async listAssignments(requestId: string) {
    const rows = await this.database
      .prepare(
        `SELECT prayer_assignments.id, prayer_assignments.assigned_to,
                staff_profiles.display_name AS assigned_to_name, prayer_assignments.assigned_at
         FROM prayer_assignments
         JOIN staff_profiles ON staff_profiles.id = prayer_assignments.assigned_to
         WHERE prayer_assignments.prayer_request_id = ?1 AND prayer_assignments.ended_at IS NULL
         ORDER BY prayer_assignments.assigned_at`,
      )
      .bind(requestId)
      .all<AssignmentRow>();
    return rows.results.map((row) => ({
      id: row.id,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedAt: row.assigned_at,
    }));
  }

  async listEligibleAssignees() {
    const rows = await this.database
      .prepare(
        `SELECT DISTINCT staff_profiles.id, staff_profiles.display_name
         FROM staff_profiles
         JOIN staff_roles ON staff_roles.staff_id = staff_profiles.id
         WHERE staff_profiles.account_status = 'active'
           AND staff_roles.role_code = 'prayer_warrior' AND staff_roles.revoked_at IS NULL
         ORDER BY staff_profiles.display_name COLLATE NOCASE`,
      )
      .all<AssigneeRow>();
    return rows.results.map((row) => ({
      id: row.id,
      displayName: row.display_name,
    }));
  }

  async isEligibleAssignee(staffId: string) {
    const row = await this.database
      .prepare(
        `SELECT EXISTS (
          SELECT 1 FROM staff_profiles
          JOIN staff_roles ON staff_roles.staff_id = staff_profiles.id
          WHERE staff_profiles.id = ?1 AND staff_profiles.account_status = 'active'
            AND staff_roles.role_code = 'prayer_warrior' AND staff_roles.revoked_at IS NULL
        ) AS found`,
      )
      .bind(staffId)
      .first<ExistsRow>();
    return row?.found === 1;
  }

  async findContact(requestId: string) {
    const row = await this.database
      .prepare(
        `SELECT prayer_request_id, name, email, phone, preferred_contact,
              follow_up_consent, deleted_at
       FROM prayer_request_contacts WHERE prayer_request_id = ?1`,
      )
      .bind(requestId)
      .first<ContactRow>();
    return row
      ? {
          prayerRequestId: row.prayer_request_id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          preferredContact: row.preferred_contact,
          followUpConsent: row.follow_up_consent === 1,
          deletedAt: row.deleted_at,
        }
      : null;
  }

  async recordSensitiveRead(
    record: PrayerMutationRecord,
    action: "prayer.detail_viewed" | "prayer.contact_revealed",
  ) {
    await this.auditStatement(record, action, record.requestId, {}).run();
  }

  async isActivelyAssigned(requestId: string, staffId: string) {
    const row = await this.database
      .prepare(
        `SELECT EXISTS (SELECT 1 FROM prayer_assignments
       WHERE prayer_request_id = ?1 AND assigned_to = ?2 AND ended_at IS NULL) AS found`,
      )
      .bind(requestId, staffId)
      .first<ExistsRow>();
    return row?.found === 1;
  }

  async assign(record: PrayerAssignmentRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO prayer_assignments
          (id, prayer_request_id, assigned_to, assigned_by, assigned_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(
          record.assignmentId,
          record.requestId,
          record.assignedTo,
          record.actorStaffId,
          record.createdAt,
        ),
      this.auditStatement(record, "prayer.assigned", record.requestId, {
        assignedTo: record.assignedTo,
      }),
    ]);
  }

  async addUpdate(record: AddPrayerUpdateRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO prayer_updates
            (id, prayer_request_id, update_type, note, visibility_scope, created_by, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(
          record.updateId,
          record.requestId,
          record.updateType,
          record.note,
          record.visibilityScope,
          record.actorStaffId,
          record.createdAt,
        ),
      this.database
        .prepare(
          `UPDATE prayer_requests
           SET status = ?2,
               privacy_scope = CASE WHEN ?3 = 1 THEN 'pastoral_only' ELSE privacy_scope END,
               updated_at = ?4
           WHERE id = ?1 AND status NOT IN ('closed', 'retention_review')`,
        )
        .bind(
          record.requestId,
          record.nextStatus,
          record.increasePrivacy ? 1 : 0,
          record.createdAt,
        ),
      this.changedRowAuditStatement(
        record,
        "prayer.update_added",
        record.requestId,
        {
          updateType: record.updateType,
          visibilityScope: record.visibilityScope,
          increasedPrivacy: record.increasePrivacy,
        },
      ),
    ]);
  }

  async close(record: ClosePrayerRecord) {
    const [result] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE prayer_requests
         SET status = 'closed', closed_at = ?2, contact_retention_due_at = ?3,
             content_retention_due_at = ?4, updated_at = ?2
         WHERE id = ?1 AND status NOT IN ('closed', 'retention_review')`,
        )
        .bind(
          record.requestId,
          record.createdAt,
          record.contactRetentionDueAt,
          record.contentRetentionDueAt,
        ),
      this.database
        .prepare(
          `INSERT INTO prayer_updates
          (id, prayer_request_id, update_type, note, visibility_scope, created_by, created_at)
         SELECT ?1, ?2, 'closed', ?3, ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(
          record.updateId,
          record.requestId,
          record.note,
          record.visibilityScope,
          record.actorStaffId,
          record.createdAt,
        ),
      this.changedRowAuditStatement(record, "prayer.closed", record.requestId, {
        contactRetentionDueAt: record.contactRetentionDueAt,
        contentRetentionDueAt: record.contentRetentionDueAt,
      }),
    ]);
    return result.meta.changes;
  }

  async findRetentionCandidates(now: string, limit: number) {
    const rows = await this.database
      .prepare(
        `SELECT prayer_requests.id,
        CASE WHEN prayer_request_contacts.deleted_at IS NULL
          AND prayer_requests.contact_retention_due_at <= ?1 THEN 1 ELSE 0 END AS delete_contact,
        CASE WHEN prayer_requests.content_deleted_at IS NULL
          AND prayer_requests.content_retention_due_at <= ?1 THEN 1 ELSE 0 END AS delete_content
       FROM prayer_requests
       LEFT JOIN prayer_request_contacts ON prayer_request_contacts.prayer_request_id = prayer_requests.id
       WHERE prayer_requests.status IN ('closed', 'retention_review')
         AND prayer_requests.legal_hold = 0
         AND ((prayer_request_contacts.deleted_at IS NULL AND prayer_requests.contact_retention_due_at <= ?1)
           OR (prayer_requests.content_deleted_at IS NULL AND prayer_requests.content_retention_due_at <= ?1))
       ORDER BY prayer_requests.closed_at LIMIT ?2`,
      )
      .bind(now, limit)
      .all<RetentionRow>();
    return rows.results.map((row) => ({
      id: row.id,
      deleteContact: row.delete_contact === 1,
      deleteContent: row.delete_content === 1,
    }));
  }

  async applyRetention(candidate: PrayerRetentionCandidate, now: string) {
    const statements: D1PreparedStatement[] = [];
    if (candidate.deleteContact) {
      statements.push(
        this.database
          .prepare(
            `UPDATE prayer_request_contacts
         SET name = NULL, email = NULL, phone = NULL, preferred_contact = 'none',
             follow_up_consent = 0, deleted_at = ?2
         WHERE prayer_request_id = ?1 AND deleted_at IS NULL`,
          )
          .bind(candidate.id, now),
      );
    }
    if (candidate.deleteContent) {
      statements.push(
        this.database
          .prepare(
            `UPDATE prayer_requests SET request_text = NULL, content_deleted_at = ?2,
             status = 'retention_review', updated_at = ?2
           WHERE id = ?1 AND legal_hold = 0 AND content_deleted_at IS NULL`,
          )
          .bind(candidate.id, now),
        this.database
          .prepare(
            `UPDATE prayer_updates SET note = NULL, content_deleted_at = ?2
           WHERE prayer_request_id = ?1 AND note IS NOT NULL AND content_deleted_at IS NULL`,
          )
          .bind(candidate.id, now),
      );
    }
    statements.push(this.systemAuditStatement(candidate.id, now, candidate));
    await this.database.batch(statements);
  }

  private mapPrayer(row: PrayerRow): PrayerRequestRecord {
    return {
      id: row.id,
      requestText: row.request_text,
      privacyScope: row.privacy_scope,
      status: row.status,
      submittedAt: row.submitted_at,
      legalHold: row.legal_hold === 1,
      closedAt: row.closed_at,
      contactRetentionDueAt: row.contact_retention_due_at,
      contentRetentionDueAt: row.content_retention_due_at,
    };
  }

  private auditStatement(
    record: {
      auditLogId: string;
      correlationId: string;
      createdAt: string;
      createdBy?: string | null;
      actorStaffId?: string;
    },
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
        (id, actor_staff_id, actor_type, action, resource_type, resource_id,
         sensitivity, metadata_json, correlation_id, created_at)
       VALUES (?1, ?2, CASE WHEN ?2 IS NULL THEN 'system' ELSE 'staff' END,
         ?3, 'prayer_request', ?4, 'prayer', ?5, ?6, ?7)`,
      )
      .bind(
        record.auditLogId,
        record.actorStaffId ?? record.createdBy ?? null,
        action,
        resourceId,
        JSON.stringify(metadata),
        record.correlationId,
        record.createdAt,
      );
  }

  private changedRowAuditStatement(
    record: PrayerMutationRecord,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
        (id, actor_staff_id, actor_type, action, resource_type, resource_id,
         sensitivity, metadata_json, correlation_id, created_at)
       SELECT ?1, ?2, 'staff', ?3, 'prayer_request', ?4, 'prayer', ?5, ?6, ?7
       WHERE changes() = 1`,
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

  private systemAuditStatement(
    resourceId: string,
    createdAt: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
        (id, actor_staff_id, actor_type, action, resource_type, resource_id,
         sensitivity, metadata_json, correlation_id, created_at)
       VALUES (?1, NULL, 'system', 'prayer.retention_applied', 'prayer_request',
         ?2, 'prayer', ?3, ?1, ?4)`,
      )
      .bind(
        crypto.randomUUID(),
        resourceId,
        JSON.stringify(metadata),
        createdAt,
      );
  }
}
