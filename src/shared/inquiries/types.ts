export const inquiryTypes = ["contact", "ministry_interest"] as const;

export type InquiryType = (typeof inquiryTypes)[number];

export const inquiryStatuses = [
  "open",
  "in_progress",
  "closed",
  "retention_review",
] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];

export function inquiryTypeLabel(type: InquiryType) {
  return type === "contact" ? "Contact" : "Ministry interest";
}
