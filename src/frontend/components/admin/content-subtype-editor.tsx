import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { saveContentSubtypeAction } from "@/backend/actions/content";
import type { ContentEntry, ContentListItem } from "@/shared/content/types";
import type { MediaAssetListItem } from "@/shared/media/types";

type Props = {
  content: ContentEntry;
  subtype: Record<string, unknown> | null;
  references: ContentListItem[];
  mediaAssets: MediaAssetListItem[];
};

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3";

function value(subtype: Props["subtype"], key: string) {
  const field = subtype?.[key];
  return typeof field === "string" || typeof field === "number"
    ? String(field)
    : "";
}

function checked(subtype: Props["subtype"], key: string, fallback = false) {
  const field = subtype?.[key];
  return typeof field === "boolean" ? field : fallback;
}

function localDateTime(rawValue: string) {
  if (!rawValue) return "";
  return new Date(rawValue)
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .replace(" ", "T")
    .slice(0, 16);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block font-semibold text-slate-800">
      {label}
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

function FormShell({
  content,
  children,
}: {
  content: ContentEntry;
  children: ReactNode;
}) {
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

export function ContentSubtypeEditor({
  content,
  subtype,
  references,
  mediaAssets,
}: Props) {
  if (content.contentType === "page") {
    return (
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-600">
        Pages use the shared title, summary, and body fields only.
      </p>
    );
  }

  const bulletinFiles = mediaAssets.filter(
    (asset) => asset.storageScope === "bulletins",
  );
  if (
    content.contentType === "bulletin" &&
    !subtype &&
    bulletinFiles.length === 0
  ) {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="font-bold">Upload a bulletin PDF first.</p>
        <p className="mt-1 text-sm leading-6">
          Bulletin details require a validated PDF from the private media
          library.
        </p>
        <Link
          className="mt-3 inline-block font-bold text-blue-800 underline"
          href={"/admin/media" as Route}
        >
          Go to media uploads
        </Link>
      </div>
    );
  }

  switch (content.contentType) {
    case "ministry":
      return (
        <FormShell content={content}>
          <Field label="Short name (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "shortName")}
              maxLength={80}
              name="shortName"
            />
          </Field>
          <Field label="Display order">
            <input
              className={inputClass}
              defaultValue={value(subtype, "sortOrder") || "0"}
              max={10000}
              min={0}
              name="sortOrder"
              type="number"
            />
          </Field>
          <Field label="Contact email (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "contactEmail")}
              maxLength={254}
              name="contactEmail"
              type="email"
            />
          </Field>
          <Field label="Contact phone (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "contactPhone")}
              maxLength={40}
              name="contactPhone"
              type="tel"
            />
          </Field>
        </FormShell>
      );
    case "series":
      return (
        <FormShell content={content}>
          <Field label="Start date (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "startsOn")}
              name="startsOn"
              type="date"
            />
          </Field>
          <Field label="End date (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "endsOn")}
              name="endsOn"
              type="date"
            />
          </Field>
        </FormShell>
      );
    case "speaker":
      const speakerImages = mediaAssets.filter((asset) =>
        asset.mimeType.startsWith("image/"),
      );
      return (
        <FormShell content={content}>
          <Field label="Biography (optional)">
            <textarea
              className={`${inputClass} min-h-36`}
              defaultValue={value(subtype, "biography")}
              maxLength={5000}
              name="biography"
            />
          </Field>
          <Field label="Profile image (optional)">
            <select
              className={inputClass}
              defaultValue={value(subtype, "photoMediaId")}
              name="photoMediaId"
            >
              <option value="">No profile image</option>
              {speakerImages.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalName}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl bg-slate-50 p-4 font-semibold text-slate-800">
            <input
              defaultChecked={checked(subtype, "isActive", true)}
              name="isActive"
              type="checkbox"
              value="true"
            />
            Show this speaker as active
          </label>
        </FormShell>
      );
    case "sermon": {
      const series = references.filter(
        (item) => item.contentType === "series" && item.status !== "archived",
      );
      const speakers = references.filter(
        (item) => item.contentType === "speaker" && item.status !== "archived",
      );
      return (
        <FormShell content={content}>
          <Field label="Date and time preached">
            <input
              className={inputClass}
              defaultValue={localDateTime(value(subtype, "preachedAt"))}
              name="preachedAt"
              required
              type="datetime-local"
            />
          </Field>
          <Field label="Scripture reference (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "scriptureReference")}
              maxLength={255}
              name="scriptureReference"
            />
          </Field>
          <Field label="Sermon series (optional)">
            <select
              className={inputClass}
              defaultValue={value(subtype, "seriesContentId")}
              name="seriesContentId"
            >
              <option value="">No series</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Speaker (optional)">
            <select
              className={inputClass}
              defaultValue={value(subtype, "speakerContentId")}
              name="speakerContentId"
            >
              <option value="">No speaker selected</option>
              {speakers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Video platform">
            <select
              className={inputClass}
              defaultValue={value(subtype, "videoProvider") || "facebook"}
              name="videoProvider"
            >
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
            </select>
          </Field>
          <Field
            label="Video link"
            hint="Use the full secure Facebook or YouTube URL."
          >
            <input
              className={inputClass}
              defaultValue={value(subtype, "videoUrl")}
              maxLength={2048}
              name="videoUrl"
              required
              type="url"
            />
          </Field>
          <Field label="Duration in seconds (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "durationSeconds")}
              max={86400}
              min={1}
              name="durationSeconds"
              type="number"
            />
          </Field>
        </FormShell>
      );
    }
    case "announcement":
      return (
        <FormShell content={content}>
          <Field label="Show from (optional)">
            <input
              className={inputClass}
              defaultValue={localDateTime(value(subtype, "visibleFrom"))}
              name="visibleFrom"
              type="datetime-local"
            />
          </Field>
          <Field label="Show until (optional)">
            <input
              className={inputClass}
              defaultValue={localDateTime(value(subtype, "visibleUntil"))}
              name="visibleUntil"
              type="datetime-local"
            />
          </Field>
          <Field label="Priority" hint="0 is normal; 10 is highest.">
            <input
              className={inputClass}
              defaultValue={value(subtype, "priority") || "0"}
              max={10}
              min={0}
              name="priority"
              type="number"
            />
          </Field>
        </FormShell>
      );
    case "bulletin":
      return (
        <FormShell content={content}>
          <Field label="Bulletin PDF">
            <select
              className={inputClass}
              defaultValue={value(subtype, "fileMediaId")}
              name="fileMediaId"
              required
            >
              <option disabled value="">
                Select a validated PDF
              </option>
              {bulletinFiles.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Issue date">
            <input
              className={inputClass}
              defaultValue={value(subtype, "issueDate")}
              name="issueDate"
              required
              type="date"
            />
          </Field>
          <Field label="Edition label (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "editionLabel")}
              maxLength={120}
              name="editionLabel"
            />
          </Field>
          <Link
            className="self-end rounded-xl border border-blue-200 px-4 py-3 text-center font-bold text-blue-800"
            href={"/admin/media" as Route}
          >
            Upload another PDF
          </Link>
        </FormShell>
      );
    case "schedule": {
      const ministries = references.filter(
        (item) => item.contentType === "ministry" && item.status !== "archived",
      );
      return (
        <FormShell content={content}>
          <Field label="Activity type">
            <select
              className={inputClass}
              defaultValue={value(subtype, "activityType") || "daily_activity"}
              name="activityType"
            >
              <option value="daily_activity">Daily activity</option>
              <option value="service">Worship service</option>
              <option value="cell_group">Family cell group</option>
              <option value="discipleship">Discipleship</option>
              <option value="prayer_meeting">Prayer meeting</option>
              <option value="ministry_meeting">Ministry meeting</option>
              <option value="outreach">Outreach</option>
              <option value="special_event">Special event</option>
            </select>
          </Field>
          <Field label="Ministry (optional)">
            <select
              className={inputClass}
              defaultValue={value(subtype, "ministryContentId")}
              name="ministryContentId"
            >
              <option value="">General church activity</option>
              {ministries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts">
            <input
              className={inputClass}
              defaultValue={localDateTime(value(subtype, "startsAt"))}
              name="startsAt"
              required
              type="datetime-local"
            />
          </Field>
          <Field label="Ends">
            <input
              className={inputClass}
              defaultValue={localDateTime(value(subtype, "endsAt"))}
              name="endsAt"
              required
              type="datetime-local"
            />
          </Field>
          <Field
            label="Repeat rule (optional)"
            hint="Examples: FREQ=DAILY or FREQ=WEEKLY;BYDAY=SU"
          >
            <input
              className={inputClass}
              defaultValue={value(subtype, "recurrenceRule")}
              maxLength={1000}
              name="recurrenceRule"
            />
          </Field>
          <Field label="Repeat until (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "recurrenceUntil")}
              name="recurrenceUntil"
              type="date"
            />
          </Field>
          <Field
            label="Location name (optional)"
            hint="For area-only visibility, enter only a safe general area such as the barangay or city."
          >
            <input
              className={inputClass}
              defaultValue={value(subtype, "locationName")}
              maxLength={180}
              name="locationName"
            />
          </Field>
          <Field
            label="Location privacy"
            hint="Protected choices hide the location fields. Never put a private address in the title, summary, description, or registration link."
          >
            <select
              className={inputClass}
              defaultValue={
                value(subtype, "locationVisibility") || "public_exact"
              }
              name="locationVisibility"
            >
              <option value="public_exact">Show exact location</option>
              <option value="public_area">Show area only</option>
              <option value="contact_required">
                Ask visitors to contact us
              </option>
              <option value="staff_only">Staff only</option>
            </select>
          </Field>
          <Field label="Location address (optional)">
            <textarea
              className={`${inputClass} min-h-24`}
              defaultValue={value(subtype, "locationAddress")}
              maxLength={500}
              name="locationAddress"
            />
          </Field>
          <Field label="Registration link (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "registrationUrl")}
              maxLength={2048}
              name="registrationUrl"
              type="url"
            />
          </Field>
          <Field label="Contact email (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "contactEmail")}
              maxLength={254}
              name="contactEmail"
              type="email"
            />
          </Field>
          <Field label="Contact phone (optional)">
            <input
              className={inputClass}
              defaultValue={value(subtype, "contactPhone")}
              maxLength={40}
              name="contactPhone"
              type="tel"
            />
          </Field>
        </FormShell>
      );
    }
  }
}
