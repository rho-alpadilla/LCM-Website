import type { ContentSubtypeFormData } from "./subtype-form-helpers";
import {
  formInputClass,
  FormField,
  subtypeChecked,
  subtypeValue,
  SubtypeForm,
} from "./subtype-form-helpers";

export function MinistrySubtypeForm({
  content,
  subtype,
}: ContentSubtypeFormData) {
  return (
    <SubtypeForm content={content}>
      <FormField label="Short name (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "shortName")}
          maxLength={80}
          name="shortName"
        />
      </FormField>
      <FormField label="Display order">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "sortOrder") || "0"}
          max={10000}
          min={0}
          name="sortOrder"
          type="number"
        />
      </FormField>
      <FormField label="Contact email (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "contactEmail")}
          maxLength={254}
          name="contactEmail"
          type="email"
        />
      </FormField>
      <FormField label="Contact phone (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "contactPhone")}
          maxLength={40}
          name="contactPhone"
          type="tel"
        />
      </FormField>
    </SubtypeForm>
  );
}

export function SeriesSubtypeForm({
  content,
  subtype,
}: ContentSubtypeFormData) {
  return (
    <SubtypeForm content={content}>
      <FormField label="Start date (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "startsOn")}
          name="startsOn"
          type="date"
        />
      </FormField>
      <FormField label="End date (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "endsOn")}
          name="endsOn"
          type="date"
        />
      </FormField>
    </SubtypeForm>
  );
}

export function SpeakerSubtypeForm({
  content,
  subtype,
  mediaAssets,
}: ContentSubtypeFormData) {
  const speakerImages = mediaAssets.filter((asset) =>
    asset.mimeType.startsWith("image/"),
  );

  return (
    <SubtypeForm content={content}>
      <FormField label="Biography (optional)">
        <textarea
          className={`${formInputClass} min-h-36`}
          defaultValue={subtypeValue(subtype, "biography")}
          maxLength={5000}
          name="biography"
        />
      </FormField>
      <FormField label="Profile image (optional)">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "photoMediaId")}
          name="photoMediaId"
        >
          <option value="">No profile image</option>
          {speakerImages.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalName}
            </option>
          ))}
        </select>
      </FormField>
      <label className="flex items-center gap-3 self-end rounded-xl bg-slate-50 p-4 font-semibold text-slate-800">
        <input
          defaultChecked={subtypeChecked(subtype, "isActive", true)}
          name="isActive"
          type="checkbox"
          value="true"
        />
        Show this speaker as active
      </label>
    </SubtypeForm>
  );
}
