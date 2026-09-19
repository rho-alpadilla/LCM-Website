import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { requireSession } = vi.hoisted(() => ({ requireSession: vi.fn() }));
vi.mock("@/backend/auth/staff-context", () => ({
  requireActiveStaffSession: requireSession,
}));

import {
  getContentEditor,
  getContentWorkspace,
} from "./content/admin-workspace";
import { getMediaWorkspace } from "./media/admin-library";
import { getPrayerDetail, getPrayerQueue } from "./prayer/admin-queue";
import { getStaffWorkspace } from "./staff/admin-directory";

describe("protected screen query boundaries", () => {
  beforeEach(() => {
    requireSession.mockReset();
    requireSession.mockRejectedValue(new Error("Access denied"));
  });

  it.each([
    ["content list", () => getContentWorkspace(), undefined],
    [
      "content editor",
      () => getContentEditor("synthetic-content-id"),
      undefined,
    ],
    ["media", () => getMediaWorkspace(), "content.media.manage"],
    ["prayer queue", () => getPrayerQueue(), "prayer.read_team"],
    [
      "prayer detail",
      () => getPrayerDetail("synthetic-prayer-id"),
      "prayer.read_team",
    ],
    ["staff", () => getStaffWorkspace(), "staff.read"],
  ] as const)(
    "denies %s before database access",
    async (_name, query, permission) => {
      await expect(query()).rejects.toThrow("Access denied");
      expect(requireSession).toHaveBeenCalledExactlyOnceWith(
        ...(permission ? [permission] : []),
      );
    },
  );
});
