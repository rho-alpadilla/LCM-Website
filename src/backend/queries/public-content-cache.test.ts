import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateTag, revalidatePath } = vi.hoisted(() => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
  updateTag,
  revalidatePath,
}));

import {
  invalidatePublicContent,
  invalidatePublicSchedule,
  invalidationTargets,
  publicContentTags,
} from "./public-content-cache";

describe("public content cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates ministry listings, details, and activity references", () => {
    expect(invalidationTargets("ministry", "young-adults")).toEqual({
      tags: [publicContentTags.ministries, publicContentTags.activities],
      paths: ["/ministries", "/ministries/young-adults", "/activities"],
    });
  });

  it("immediately expires only the affected sermon cache and paths", () => {
    invalidatePublicContent("sermon", "faith-in-action");
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(
      publicContentTags.sermons,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/sermons");
    expect(revalidatePath).toHaveBeenCalledWith("/sermons/faith-in-action");
  });

  it("invalidates activities after a published schedule exception", () => {
    invalidatePublicSchedule();
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(
      publicContentTags.activities,
    );
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/activities");
  });
});
