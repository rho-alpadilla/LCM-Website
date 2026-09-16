import "server-only";

import { revalidatePath, unstable_cache, updateTag } from "next/cache";

import { requireCloudflareBindings } from "@/server/cloudflare/bindings";
import type { ContentType } from "@/server/repositories/content-repository";
import { PublicContentRepository } from "@/server/repositories/public-content-repository";

export const publicContentTags = {
  ministries: "public-content:ministries",
  sermons: "public-content:sermons",
  announcements: "public-content:announcements",
  bulletins: "public-content:bulletins",
  activities: "public-content:activities",
} as const;

const cacheRevalidateSeconds = 3600;
const announcementRevalidateSeconds = 60;

async function repository() {
  const environment = await requireCloudflareBindings();
  return new PublicContentRepository(environment.DB);
}

const cachedMinistries = unstable_cache(
  async () => (await repository()).listMinistries(),
  ["public-ministries-v1"],
  {
    tags: [publicContentTags.ministries],
    revalidate: cacheRevalidateSeconds,
  },
);

const cachedMinistry = unstable_cache(
  async (slug: string) => (await repository()).findMinistryBySlug(slug),
  ["public-ministry-v1"],
  {
    tags: [publicContentTags.ministries],
    revalidate: cacheRevalidateSeconds,
  },
);

const cachedSermons = unstable_cache(
  async () => (await repository()).listSermons(),
  ["public-sermons-v1"],
  {
    tags: [publicContentTags.sermons],
    revalidate: cacheRevalidateSeconds,
  },
);

const cachedSermon = unstable_cache(
  async (slug: string) => (await repository()).findSermonBySlug(slug),
  ["public-sermon-v1"],
  {
    tags: [publicContentTags.sermons],
    revalidate: cacheRevalidateSeconds,
  },
);

const cachedAnnouncements = unstable_cache(
  async (visibilityMinute: string) =>
    (await repository()).listAnnouncements(visibilityMinute),
  ["public-announcements-v1"],
  {
    tags: [publicContentTags.announcements],
    revalidate: announcementRevalidateSeconds,
  },
);

const cachedAnnouncement = unstable_cache(
  async (slug: string, visibilityMinute: string) =>
    (await repository()).findAnnouncementBySlug(slug, visibilityMinute),
  ["public-announcement-v1"],
  {
    tags: [publicContentTags.announcements],
    revalidate: announcementRevalidateSeconds,
  },
);

const cachedBulletins = unstable_cache(
  async () => (await repository()).listBulletins(),
  ["public-bulletins-v1"],
  {
    tags: [publicContentTags.bulletins],
    revalidate: cacheRevalidateSeconds,
  },
);

const cachedActivities = unstable_cache(
  async () => (await repository()).listActivities(),
  ["public-activities-v1"],
  {
    tags: [publicContentTags.activities],
    revalidate: cacheRevalidateSeconds,
  },
);

export const getPublicMinistries = cachedMinistries;
export const getPublicMinistry = cachedMinistry;
export const getPublicSermons = cachedSermons;
export const getPublicSermon = cachedSermon;
export const getPublicBulletins = cachedBulletins;
export const getPublicActivities = cachedActivities;

export function getPublicAnnouncements(now = new Date()) {
  return cachedAnnouncements(toMinute(now));
}

export function getPublicAnnouncement(slug: string, now = new Date()) {
  return cachedAnnouncement(slug, toMinute(now));
}

export function invalidatePublicContent(
  contentType: ContentType,
  slug: string,
) {
  const targets = invalidationTargets(contentType, slug);
  for (const tag of targets.tags) updateTag(tag);
  for (const path of targets.paths) revalidatePath(path);
}

export function invalidatePublicSchedule() {
  updateTag(publicContentTags.activities);
  revalidatePath("/activities");
}

export function invalidationTargets(contentType: ContentType, slug: string) {
  switch (contentType) {
    case "ministry":
      return {
        tags: [publicContentTags.ministries, publicContentTags.activities],
        paths: ["/ministries", `/ministries/${slug}`, "/activities"],
      };
    case "sermon":
      return {
        tags: [publicContentTags.sermons],
        paths: ["/sermons", `/sermons/${slug}`],
      };
    case "series":
    case "speaker":
      return { tags: [publicContentTags.sermons], paths: ["/sermons"] };
    case "schedule":
      return { tags: [publicContentTags.activities], paths: ["/activities"] };
    case "announcement":
      return {
        tags: [publicContentTags.announcements],
        paths: ["/announcements", `/announcements/${slug}`],
      };
    case "bulletin":
      return { tags: [publicContentTags.bulletins], paths: ["/bulletins"] };
    case "page":
      return { tags: [], paths: ["/"] };
  }
}

function toMinute(date: Date) {
  const timestamp = Math.floor(date.getTime() / 60_000) * 60_000;
  return new Date(timestamp).toISOString();
}
