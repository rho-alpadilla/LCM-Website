import type { ContentStatus, ContentType } from "@/shared/content/types";

export const contentTypeLabels: Record<ContentType, string> = {
  page: "Page",
  ministry: "Ministry",
  sermon: "Sermon",
  series: "Sermon series",
  speaker: "Speaker",
  schedule: "Schedule or daily activity",
  announcement: "Announcement",
  bulletin: "Bulletin",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const contentManagementPermissions: Record<ContentType, string> = {
  page: "content.pages.manage",
  ministry: "content.ministries.manage",
  sermon: "content.sermons.manage",
  series: "content.series.manage",
  speaker: "content.speakers.manage",
  schedule: "content.schedule.manage",
  announcement: "content.announcements.manage",
  bulletin: "content.bulletins.manage",
};

export const allContentTypes = Object.keys(contentTypeLabels) as ContentType[];

export function manageableContentTypes(permissions: string[]) {
  return allContentTypes.filter((type) =>
    permissions.includes(contentManagementPermissions[type]),
  );
}
