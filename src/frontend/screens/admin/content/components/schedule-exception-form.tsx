import { saveScheduleExceptionAction } from "@/backend/actions/content";

import { formInputClass, FormField } from "./form-field";

export function ScheduleExceptionForm({ contentId }: { contentId: string }) {
  return (
    <form
      action={saveScheduleExceptionAction}
      className="mt-6 grid gap-5 sm:grid-cols-2"
    >
      <input name="contentId" type="hidden" value={contentId} />
      <FormField label="Original occurrence date">
        <input
          className={formInputClass}
          name="occurrenceDate"
          required
          type="date"
        />
      </FormField>
      <FormField label="Action">
        <select className={formInputClass} name="exceptionAction" required>
          <option value="cancelled">Cancel this occurrence</option>
          <option value="rescheduled">Reschedule this occurrence</option>
        </select>
      </FormField>
      <FormField
        label="Replacement start"
        hint="Required only when rescheduling."
      >
        <input
          className={formInputClass}
          name="replacementStartsAt"
          type="datetime-local"
        />
      </FormField>
      <FormField
        label="Replacement end"
        hint="Required only when rescheduling."
      >
        <input
          className={formInputClass}
          name="replacementEndsAt"
          type="datetime-local"
        />
      </FormField>
      <FormField label="Public note (optional)" wide>
        <textarea
          className={`${formInputClass} min-h-20`}
          maxLength={500}
          name="publicNote"
        />
      </FormField>
      <button
        className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
        type="submit"
      >
        Save schedule exception
      </button>
    </form>
  );
}
