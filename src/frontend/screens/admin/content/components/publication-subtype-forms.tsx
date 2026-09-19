import type { Route } from "next";
import Link from "next/link";

import type { ContentSubtypeFormData } from "./subtype-form-helpers";
import {
  formInputClass,
  FormField,
  manilaLocalDateTime,
  subtypeValue,
  SubtypeForm,
} from "./subtype-form-helpers";

export function SermonSubtypeForm({
  content,
  subtype,
  references,
}: ContentSubtypeFormData) {
  const series = references.filter(
    (item) => item.contentType === "series" && item.status !== "archived",
  );
  const speakers = references.filter(
    (item) => item.contentType === "speaker" && item.status !== "archived",
  );

  return (
    <SubtypeForm content={content}>
      <FormField label="Date and time preached">
        <input
          className={formInputClass}
          defaultValue={manilaLocalDateTime(
            subtypeValue(subtype, "preachedAt"),
          )}
          name="preachedAt"
          required
          type="datetime-local"
        />
      </FormField>
      <FormField label="Scripture reference (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "scriptureReference")}
          maxLength={255}
          name="scriptureReference"
        />
      </FormField>
      <FormField label="Sermon series (optional)">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "seriesContentId")}
          name="seriesContentId"
        >
          <option value="">No series</option>
          {series.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Speaker (optional)">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "speakerContentId")}
          name="speakerContentId"
        >
          <option value="">No speaker selected</option>
          {speakers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Video platform">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "videoProvider") || "facebook"}
          name="videoProvider"
        >
          <option value="facebook">Facebook</option>
          <option value="youtube">YouTube</option>
        </select>
      </FormField>
      <FormField
        label="Video link"
        hint="Use the full secure Facebook or YouTube URL."
      >
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "videoUrl")}
          maxLength={2048}
          name="videoUrl"
          required
          type="url"
        />
      </FormField>
      <FormField label="Duration in seconds (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "durationSeconds")}
          max={86400}
          min={1}
          name="durationSeconds"
          type="number"
        />
      </FormField>
    </SubtypeForm>
  );
}

export function AnnouncementSubtypeForm({
  content,
  subtype,
}: ContentSubtypeFormData) {
  return (
    <SubtypeForm content={content}>
      <FormField label="Show from (optional)">
        <input
          className={formInputClass}
          defaultValue={manilaLocalDateTime(
            subtypeValue(subtype, "visibleFrom"),
          )}
          name="visibleFrom"
          type="datetime-local"
        />
      </FormField>
      <FormField label="Show until (optional)">
        <input
          className={formInputClass}
          defaultValue={manilaLocalDateTime(
            subtypeValue(subtype, "visibleUntil"),
          )}
          name="visibleUntil"
          type="datetime-local"
        />
      </FormField>
      <FormField label="Priority" hint="0 is normal; 10 is highest.">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "priority") || "0"}
          max={10}
          min={0}
          name="priority"
          type="number"
        />
      </FormField>
    </SubtypeForm>
  );
}

export function BulletinSubtypeForm({
  content,
  subtype,
  mediaAssets,
}: ContentSubtypeFormData) {
  const bulletinFiles = mediaAssets.filter(
    (asset) => asset.storageScope === "bulletins",
  );

  return (
    <SubtypeForm content={content}>
      <FormField label="Bulletin PDF">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "fileMediaId")}
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
      </FormField>
      <FormField label="Issue date">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "issueDate")}
          name="issueDate"
          required
          type="date"
        />
      </FormField>
      <FormField label="Edition label (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "editionLabel")}
          maxLength={120}
          name="editionLabel"
        />
      </FormField>
      <Link
        className="self-end rounded-xl border border-blue-200 px-4 py-3 text-center font-bold text-blue-800"
        href={"/admin/media" as Route}
      >
        Upload another PDF
      </Link>
    </SubtypeForm>
  );
}
