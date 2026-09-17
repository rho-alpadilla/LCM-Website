import { describe, expect, it, vi } from "vitest";

import { PrayerRepository } from "@/backend/repositories/prayer-repository";

function fakeDatabase(
  options: { rejectBatch?: boolean; allResults?: unknown[] } = {},
) {
  const sql: string[] = [];
  const statements: D1PreparedStatement[] = [];
  const prepare = vi.fn((query: string) => {
    sql.push(query);
    const statement = {
      bind: vi.fn(function (this: D1PreparedStatement) {
        return this;
      }),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({
        results: options.allResults ?? [],
        success: true,
        meta: {},
      }),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      raw: vi.fn(),
    } as unknown as D1PreparedStatement;
    statements.push(statement);
    return statement;
  });
  const batch = options.rejectBatch
    ? vi.fn().mockRejectedValue(new Error("synthetic transaction failure"))
    : vi.fn(async (items: D1PreparedStatement[]) =>
        items.map(() => ({ success: true, meta: { changes: 1 }, results: [] })),
      );
  return {
    database: { prepare, batch } as unknown as D1Database,
    batch,
    sql,
    statements,
  };
}

describe("sensitive workflow repository transactions", () => {
  it("creates a prayer request and its audit trail in one D1 batch", async () => {
    const fake = fakeDatabase();
    const repository = new PrayerRepository(fake.database);
    await repository.create({
      requestId: "synthetic-prayer",
      requestText: "Synthetic request",
      privacyScope: "pastoral_only",
      source: "website",
      createdBy: null,
      contact: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      auditLogId: "synthetic-audit",
      correlationId: "synthetic-correlation",
    });
    expect(fake.batch).toHaveBeenCalledOnce();
    expect(fake.batch.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("selects retention candidates only when due and not under legal hold", async () => {
    const fake = fakeDatabase({ allResults: [] });
    const repository = new PrayerRepository(fake.database);
    await repository.findRetentionCandidates("2026-01-01T00:00:00.000Z", 100);
    const query = fake.sql.join("\n");
    expect(query).toContain("prayer_requests.legal_hold = 0");
    expect(query).toContain("contact_retention_due_at <= ?1");
    expect(query).toContain("content_retention_due_at <= ?1");
  });
});
