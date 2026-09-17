export type ContentType =
  | "page"
  | "ministry"
  | "sermon"
  | "series"
  | "speaker"
  | "schedule"
  | "announcement"
  | "bulletin";

export type ContentStatus =
  "draft" | "pending_review" | "approved" | "published" | "archived";

export type ContentBody = {
  format: "plain_text";
  text: string;
};

export type ContentEntry = {
  id: string;
  contentType: ContentType;
  slug: string;
  title: string;
  summary: string | null;
  body: ContentBody;
  coverMediaId: string | null;
  status: ContentStatus;
  version: number;
  createdBy: string;
  submittedBy: string | null;
};

export type ContentListItem = Pick<
  ContentEntry,
  "id" | "contentType" | "slug" | "title" | "status" | "version"
> & { updatedAt: string };
