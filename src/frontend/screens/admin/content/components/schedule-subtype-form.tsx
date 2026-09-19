import type { ContentSubtypeFormData } from "./subtype-form-helpers";
import {
  formInputClass,
  FormField,
  manilaLocalDateTime,
  subtypeValue,
  SubtypeForm,
} from "./subtype-form-helpers";

export function ScheduleSubtypeForm({
  content,
  subtype,
  references,
}: ContentSubtypeFormData) {
  const ministries = references.filter(
    (item) => item.contentType === "ministry" && item.status !== "archived",
  );

  return (
    <SubtypeForm content={content}>
      <FormField label="Activity type">
        <select
          className={formInputClass}
          defaultValue={
            subtypeValue(subtype, "activityType") || "daily_activity"
          }
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
      </FormField>
      <FormField label="Ministry (optional)">
        <select
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "ministryContentId")}
          name="ministryContentId"
        >
          <option value="">General church activity</option>
          {ministries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Starts">
        <input
          className={formInputClass}
          defaultValue={manilaLocalDateTime(subtypeValue(subtype, "startsAt"))}
          name="startsAt"
          required
          type="datetime-local"
        />
      </FormField>
      <FormField label="Ends">
        <input
          className={formInputClass}
          defaultValue={manilaLocalDateTime(subtypeValue(subtype, "endsAt"))}
          name="endsAt"
          required
          type="datetime-local"
        />
      </FormField>
      <FormField
        label="Repeat rule (optional)"
        hint="Examples: FREQ=DAILY or FREQ=WEEKLY;BYDAY=SU"
      >
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "recurrenceRule")}
          maxLength={1000}
          name="recurrenceRule"
        />
      </FormField>
      <FormField label="Repeat until (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "recurrenceUntil")}
          name="recurrenceUntil"
          type="date"
        />
      </FormField>
      <FormField
        label="Location name (optional)"
        hint="For area-only visibility, enter only a safe general area such as the barangay or city."
      >
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "locationName")}
          maxLength={180}
          name="locationName"
        />
      </FormField>
      <FormField
        label="Location privacy"
        hint="Protected choices hide the location fields. Never put a private address in the title, summary, description, or registration link."
      >
        <select
          className={formInputClass}
          defaultValue={
            subtypeValue(subtype, "locationVisibility") || "public_exact"
          }
          name="locationVisibility"
        >
          <option value="public_exact">Show exact location</option>
          <option value="public_area">Show area only</option>
          <option value="contact_required">Ask visitors to contact us</option>
          <option value="staff_only">Staff only</option>
        </select>
      </FormField>
      <FormField label="Location address (optional)">
        <textarea
          className={`${formInputClass} min-h-24`}
          defaultValue={subtypeValue(subtype, "locationAddress")}
          maxLength={500}
          name="locationAddress"
        />
      </FormField>
      <FormField label="Registration link (optional)">
        <input
          className={formInputClass}
          defaultValue={subtypeValue(subtype, "registrationUrl")}
          maxLength={2048}
          name="registrationUrl"
          type="url"
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
