import type { ContentStatus, ContentType } from "@/shared/content/types";

export const contentTypeLabels: Record<ContentType, string> = {
  page: "Page",
  ministry: "Ministry",
  sermon: "Sermon",
  series: "Sermon series",
  speaker: "Speaker",
  schedule: "Daily activity",
  announcement: "Announcement",
  bulletin: "Bulletin",
};

export const contentAdminSections = [
  {
    id: "pages",
    label: "Website pages",
    description: "About and other website details",
    contentTypes: ["page"],
  },
  {
    id: "ministries",
    label: "Ministries",
    description: "Ministry details and leaders",
    contentTypes: ["ministry"],
  },
  {
    id: "sermons",
    label: "Sermons",
    description: "Messages, series, and speakers",
    contentTypes: ["sermon", "series", "speaker"],
  },
  {
    id: "activities",
    label: "Daily activities",
    description: "Calendar and recurring activities",
    contentTypes: ["schedule"],
  },
  {
    id: "announcements",
    label: "Announcements",
    description: "Church updates and notices",
    contentTypes: ["announcement"],
  },
  {
    id: "bulletins",
    label: "Bulletins",
    description: "Weekly bulletin posts and files",
    contentTypes: ["bulletin"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  contentTypes: readonly ContentType[];
}>;

export type ContentAdminSection = (typeof contentAdminSections)[number];

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

export function manageableContentSections(permissions: string[]) {
  const manageableTypes = manageableContentTypes(permissions);
  return contentAdminSections
    .map((section) => ({
      ...section,
      contentTypes: section.contentTypes.filter((type) =>
        manageableTypes.includes(type),
      ),
    }))
    .filter((section) => section.contentTypes.length > 0);
}
