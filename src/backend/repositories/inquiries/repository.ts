import type { InquiryStatus, InquiryType } from "@/shared/inquiries/types";

export type InquiryQueueItem = {
  id: string;
  inquiryType: InquiryType;
  status: InquiryStatus;
  name: string | null;
  ministryTitle: string | null;
  submittedAt: string;
  assignedToName: string | null;
};

export type InquiryRecord = InquiryQueueItem & {
  ministryContentId: string | null;
  email: string | null;
  phone: string | null;
  preferredContact: "none" | "email" | "phone";
  followUpConsent: boolean;
  message: string | null;
  closedAt: string | null;
  retentionDueAt: string | null;
  redactedAt: string | null;
  assignedToId: string | null;
};

export type InquiryUpdateRecord = {
  id: string;
  updateType: "note" | "responded" | "closed";
  note: string | null;
  createdByName: string;
  createdAt: string;
  redactedAt: string | null;
};

export type InquiryAssignee = { id: string; displayName: string };

export type CreateInquiryRecord = {
  inquiryId: string;
  input: {
    inquiryType: InquiryType;
    ministryContentId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    preferredContact: "email" | "phone";
    followUpConsent: true;
    message: string | null;
  };
  createdAt: string;
  auditLogId: string;
  correlationId: string;
};

export type InquiryMutationRecord = {
  inquiryId: string;
  actorStaffId: string;
  createdAt: string;
  auditLogId: string;
  correlationId: string;
};

export type AssignInquiryRecord = InquiryMutationRecord & {
  assignmentId: string;
  assignedTo: string;
};

export type AddInquiryUpdateRecord = InquiryMutationRecord & {
  updateId: string;
  updateType: "note" | "responded";
  note: string;
};

export type CloseInquiryRecord = InquiryMutationRecord & {
  updateId: string;
  note: string;
  retentionDueAt: string;
};

export interface InquiryRepositoryPort {
  create(record: CreateInquiryRecord): Promise<void>;
  listQueue(types: InquiryType[]): Promise<InquiryQueueItem[]>;
  findById(id: string): Promise<InquiryRecord | null>;
  listUpdates(id: string): Promise<InquiryUpdateRecord[]>;
  recordSensitiveRead(record: InquiryMutationRecord): Promise<void>;
  listEligibleAssignees(type: InquiryType): Promise<InquiryAssignee[]>;
  isEligibleAssignee(type: InquiryType, staffId: string): Promise<boolean>;
  assign(record: AssignInquiryRecord): Promise<void>;
  addUpdate(record: AddInquiryUpdateRecord): Promise<void>;
  close(record: CloseInquiryRecord): Promise<number>;
  findRetentionCandidates(now: string, limit: number): Promise<string[]>;
  applyRetention(id: string, now: string): Promise<void>;
}

type InquiryRow = {
  id: string;
  inquiry_type: InquiryType;
  status: InquiryStatus;
  name: string | null;
  ministry_content_id: string | null;
  ministry_title: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: "none" | "email" | "phone";
  follow_up_consent: number;
  message: string | null;
  submitted_at: string;
  closed_at: string | null;
  retention_due_at: string | null;
  redacted_at: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
};

type InquiryUpdateRow = {
  id: string;
  update_type: InquiryUpdateRecord["updateType"];
  note: string | null;
  created_by_name: string;
  created_at: string;
  redacted_at: string | null;
};

type AssigneeRow = { id: string; display_name: string };
type ExistsRow = { found: number };
type IdRow = { id: string };

export class InquiryRepository implements InquiryRepositoryPort {
  constructor(private readonly database: D1Database) {}

  async create(record: CreateInquiryRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO visitor_inquiries
          (id, inquiry_type, ministry_content_id, name, email, phone,
           preferred_contact, follow_up_consent, message, status, source,
           submitted_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', 'website', ?10, ?10)`,
        )
        .bind(
          record.inquiryId,
          record.input.inquiryType,
          record.input.ministryContentId,
          record.input.name,
          record.input.email,
          record.input.phone,
          record.input.preferredContact,
          1,
          record.input.message,
          record.createdAt,
        ),
      this.auditStatement(record, "inquiry.created", record.inquiryId, {
        inquiryType: record.input.inquiryType,
        hasMinistrySelection: record.input.ministryContentId !== null,
      }),
    ]);
  }

  async listQueue(types: InquiryType[]) {
    if (types.length === 0) return [];
    const placeholders = types.map((_, index) => `?${index + 1}`).join(", ");
    const result = await this.database
      .prepare(
        `SELECT inquiry.id, inquiry.inquiry_type, inquiry.status, inquiry.name,
                inquiry.ministry_content_id, ministry.title AS ministry_title,
                inquiry.submitted_at, assignee.id AS assigned_to_id,
                assignee.display_name AS assigned_to_name
         FROM visitor_inquiries AS inquiry
         LEFT JOIN content_entries AS ministry ON ministry.id = inquiry.ministry_content_id
         LEFT JOIN visitor_inquiry_assignments AS assignment
           ON assignment.inquiry_id = inquiry.id AND assignment.ended_at IS NULL
         LEFT JOIN staff_profiles AS assignee ON assignee.id = assignment.assigned_to
         WHERE inquiry.inquiry_type IN (${placeholders})
         ORDER BY CASE inquiry.status
           WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'closed' THEN 2 ELSE 3 END,
           inquiry.submitted_at ASC
         LIMIT 200`,
      )
      .bind(...types)
      .all<InquiryRow>();
    return result.results.map((row) => this.mapQueueItem(row));
  }

  async findById(id: string) {
    const row = await this.database
      .prepare(
        `SELECT inquiry.id, inquiry.inquiry_type, inquiry.status, inquiry.name,
                inquiry.ministry_content_id, ministry.title AS ministry_title,
                inquiry.email, inquiry.phone, inquiry.preferred_contact,
                inquiry.follow_up_consent, inquiry.message, inquiry.submitted_at,
                inquiry.closed_at, inquiry.retention_due_at, inquiry.redacted_at,
                assignee.id AS assigned_to_id, assignee.display_name AS assigned_to_name
         FROM visitor_inquiries AS inquiry
         LEFT JOIN content_entries AS ministry ON ministry.id = inquiry.ministry_content_id
         LEFT JOIN visitor_inquiry_assignments AS assignment
           ON assignment.inquiry_id = inquiry.id AND assignment.ended_at IS NULL
         LEFT JOIN staff_profiles AS assignee ON assignee.id = assignment.assigned_to
         WHERE inquiry.id = ?1`,
      )
      .bind(id)
      .first<InquiryRow>();
    return row ? this.mapRecord(row) : null;
  }

  async listUpdates(id: string) {
    const result = await this.database
      .prepare(
        `SELECT update_record.id, update_record.update_type, update_record.note,
                staff.display_name AS created_by_name, update_record.created_at,
                update_record.redacted_at
         FROM visitor_inquiry_updates AS update_record
         JOIN staff_profiles AS staff ON staff.id = update_record.created_by
         WHERE update_record.inquiry_id = ?1
         ORDER BY update_record.created_at ASC`,
      )
      .bind(id)
      .all<InquiryUpdateRow>();
    return result.results.map((row) => ({
      id: row.id,
      updateType: row.update_type,
      note: row.note,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      redactedAt: row.redacted_at,
    }));
  }

  async recordSensitiveRead(record: InquiryMutationRecord) {
    await this.auditStatement(
      record,
      "inquiry.detail_viewed",
      record.inquiryId,
      {},
    ).run();
  }

  async listEligibleAssignees(type: InquiryType) {
    const permission = this.respondPermission(type);
    const result = await this.database
      .prepare(
        `SELECT DISTINCT staff.id, staff.display_name
         FROM staff_profiles AS staff
         JOIN staff_roles AS role ON role.staff_id = staff.id
         JOIN role_permissions AS grant ON grant.role_code = role.role_code
         WHERE staff.account_status = 'active' AND role.revoked_at IS NULL
           AND grant.permission_code = ?1
         ORDER BY staff.display_name COLLATE NOCASE`,
      )
      .bind(permission)
      .all<AssigneeRow>();
    return result.results.map((row) => ({
      id: row.id,
      displayName: row.display_name,
    }));
  }

  async isEligibleAssignee(type: InquiryType, staffId: string) {
    const row = await this.database
      .prepare(
        `SELECT EXISTS (
          SELECT 1 FROM staff_profiles AS staff
          JOIN staff_roles AS role ON role.staff_id = staff.id
          JOIN role_permissions AS grant ON grant.role_code = role.role_code
          WHERE staff.id = ?1 AND staff.account_status = 'active'
            AND role.revoked_at IS NULL AND grant.permission_code = ?2
        ) AS found`,
      )
      .bind(staffId, this.respondPermission(type))
      .first<ExistsRow>();
    return row?.found === 1;
  }

  async assign(record: AssignInquiryRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE visitor_inquiry_assignments
           SET ended_at = ?2
           WHERE inquiry_id = ?1 AND ended_at IS NULL`,
        )
        .bind(record.inquiryId, record.createdAt),
      this.database
        .prepare(
          `INSERT INTO visitor_inquiry_assignments
          (id, inquiry_id, assigned_to, assigned_by, assigned_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(
          record.assignmentId,
          record.inquiryId,
          record.assignedTo,
          record.actorStaffId,
          record.createdAt,
        ),
      this.database
        .prepare(
          `UPDATE visitor_inquiries
           SET status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
               updated_at = ?2
           WHERE id = ?1 AND status IN ('open', 'in_progress')`,
        )
        .bind(record.inquiryId, record.createdAt),
      this.auditStatement(record, "inquiry.assigned", record.inquiryId, {
        assignedTo: record.assignedTo,
      }),
    ]);
  }

  async addUpdate(record: AddInquiryUpdateRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE visitor_inquiries
           SET status = 'in_progress', updated_at = ?2
           WHERE id = ?1 AND status IN ('open', 'in_progress')`,
        )
        .bind(record.inquiryId, record.createdAt),
      this.database
        .prepare(
          `INSERT INTO visitor_inquiry_updates
          (id, inquiry_id, update_type, note, created_by, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(
          record.updateId,
          record.inquiryId,
          record.updateType,
          record.note,
          record.actorStaffId,
          record.createdAt,
        ),
      this.changedRowAuditStatement(
        record,
        "inquiry.updated",
        record.inquiryId,
        {
          updateType: record.updateType,
        },
      ),
    ]);
  }

  async close(record: CloseInquiryRecord) {
    const [result] = await this.database.batch([
      this.database
        .prepare(
          `UPDATE visitor_inquiries
           SET status = 'closed', closed_at = ?2, retention_due_at = ?3,
               updated_at = ?2
           WHERE id = ?1 AND status IN ('open', 'in_progress')`,
        )
        .bind(record.inquiryId, record.createdAt, record.retentionDueAt),
      this.database
        .prepare(
          `INSERT INTO visitor_inquiry_updates
          (id, inquiry_id, update_type, note, created_by, created_at)
         SELECT ?1, ?2, 'closed', ?3, ?4, ?5 WHERE changes() = 1`,
        )
        .bind(
          record.updateId,
          record.inquiryId,
          record.note,
          record.actorStaffId,
          record.createdAt,
        ),
      this.changedRowAuditStatement(
        record,
        "inquiry.closed",
        record.inquiryId,
        {
          retentionDueAt: record.retentionDueAt,
        },
      ),
    ]);
    return result.meta.changes;
  }

  async findRetentionCandidates(now: string, limit: number) {
    const result = await this.database
      .prepare(
        `SELECT id FROM visitor_inquiries
         WHERE status = 'closed' AND redacted_at IS NULL AND retention_due_at <= ?1
         ORDER BY closed_at ASC LIMIT ?2`,
      )
      .bind(now, limit)
      .all<IdRow>();
    return result.results.map((row) => row.id);
  }

  async applyRetention(id: string, now: string) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE visitor_inquiry_updates
           SET note = NULL, redacted_at = ?2
           WHERE inquiry_id = ?1 AND note IS NOT NULL AND redacted_at IS NULL`,
        )
        .bind(id, now),
      this.database
        .prepare(
          `UPDATE visitor_inquiries
           SET name = NULL, email = NULL, phone = NULL, preferred_contact = 'none',
               follow_up_consent = 0, message = NULL, status = 'retention_review',
               redacted_at = ?2, updated_at = ?2
           WHERE id = ?1 AND status = 'closed' AND redacted_at IS NULL
             AND retention_due_at <= ?2`,
        )
        .bind(id, now),
      this.systemAuditStatement(id, now),
    ]);
  }

  private mapQueueItem(row: InquiryRow): InquiryQueueItem {
    return {
      id: row.id,
      inquiryType: row.inquiry_type,
      status: row.status,
      name: row.name,
      ministryTitle: row.ministry_title,
      submittedAt: row.submitted_at,
      assignedToName: row.assigned_to_name,
    };
  }

  private mapRecord(row: InquiryRow): InquiryRecord {
    return {
      ...this.mapQueueItem(row),
      ministryContentId: row.ministry_content_id,
      email: row.email,
      phone: row.phone,
      preferredContact: row.preferred_contact,
      followUpConsent: row.follow_up_consent === 1,
      message: row.message,
      closedAt: row.closed_at,
      retentionDueAt: row.retention_due_at,
      redactedAt: row.redacted_at,
      assignedToId: row.assigned_to_id,
    };
  }

  private respondPermission(type: InquiryType) {
    return type === "contact" ? "contact.respond" : "ministry_interest.respond";
  }

  private auditStatement(
    record: {
      auditLogId: string;
      correlationId: string;
      createdAt: string;
      actorStaffId?: string | null;
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
         ?3, 'visitor_inquiry', ?4, 'personal', ?5, ?6, ?7)`,
      )
      .bind(
        record.auditLogId,
        record.actorStaffId ?? null,
        action,
        resourceId,
        JSON.stringify(metadata),
        record.correlationId,
        record.createdAt,
      );
  }

  private changedRowAuditStatement(
    record: InquiryMutationRecord,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
        (id, actor_staff_id, actor_type, action, resource_type, resource_id,
         sensitivity, metadata_json, correlation_id, created_at)
       SELECT ?1, ?2, 'staff', ?3, 'visitor_inquiry', ?4, 'personal', ?5, ?6, ?7
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

  private systemAuditStatement(resourceId: string, createdAt: string) {
    return this.database
      .prepare(
        `INSERT INTO audit_logs
        (id, actor_staff_id, actor_type, action, resource_type, resource_id,
         sensitivity, metadata_json, correlation_id, created_at)
       VALUES (?1, NULL, 'system', 'inquiry.retention_applied', 'visitor_inquiry',
         ?2, 'personal', '{}', ?1, ?3)`,
      )
      .bind(crypto.randomUUID(), resourceId, createdAt);
  }
}
