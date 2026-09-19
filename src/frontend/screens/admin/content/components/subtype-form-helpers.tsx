import type { ReactNode } from "react";

import { saveContentSubtypeAction } from "@/backend/actions/content";
import type { ContentEntry, ContentListItem } from "@/shared/content/types";
import type { MediaAssetListItem } from "@/shared/media/types";

import { formInputClass, FormField } from "./form-field";

export type ContentSubtypeFormData = {
  content: ContentEntry;
  subtype: Record<string, unknown> | null;
  references: ContentListItem[];
  mediaAssets: MediaAssetListItem[];
};

export function subtypeValue(
  subtype: ContentSubtypeFormData["subtype"],
  key: string,
) {
  const field = subtype?.[key];
  return typeof field === "string" || typeof field === "number"
    ? String(field)
    : "";
}

export function subtypeChecked(
  subtype: ContentSubtypeFormData["subtype"],
  key: string,
  fallback = false,
) {
  const field = subtype?.[key];
  return typeof field === "boolean" ? field : fallback;
}

export function manilaLocalDateTime(rawValue: string) {
  if (!rawValue) return "";
  return new Date(rawValue)
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .replace(" ", "T")
    .slice(0, 16);
}

export function SubtypeForm({
  content,
  children,
}: Pick<ContentSubtypeFormData, "content"> & { children: ReactNode }) {
  return (
    <form
      action={saveContentSubtypeAction}
      className="mt-6 grid gap-5 sm:grid-cols-2"
    >
      <input name="contentId" type="hidden" value={content.id} />
      <input name="contentType" type="hidden" value={content.contentType} />
      {children}
      <button
        className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
        type="submit"
      >
        Save specific details
      </button>
    </form>
  );
}

export { formInputClass, FormField };
