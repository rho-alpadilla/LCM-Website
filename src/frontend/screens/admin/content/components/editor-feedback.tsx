const successMessages: Record<string, string> = {
  draft_created: "Draft created. Add its content and specific details below.",
  basic_saved: "The main content was saved.",
  details_saved: "The specific details were saved.",
  submitted: "The content was submitted for review.",
  approved: "The content was approved.",
  changes_requested: "The content was returned to draft with review notes.",
  published: "The content was published.",
  archived: "The content was archived.",
  exception_saved: "The schedule exception was saved.",
};

const errorMessages: Record<string, string> = {
  basic_save_failed:
    "The main content could not be saved. Check every field and retry.",
  subtype_save_failed:
    "The specific details could not be saved. Check required fields, dates, and links.",
  submit_failed: "Submission failed. Save all required details first.",
  approval_failed:
    "Approval failed. The status or your approval permission may have changed.",
  change_request_failed:
    "The change request failed. Enter a clear reason of at least 10 characters.",
  publish_failed:
    "Publication failed. Approved content and ready media are required.",
  archive_not_confirmed: "Confirm the archive action before continuing.",
  archive_failed:
    "Archiving failed. Enter a reason of at least 10 characters and retry.",
  exception_save_failed:
    "The schedule exception could not be saved. Check the date and replacement times.",
};

type EditorFeedbackProps = {
  messageCode: string;
  errorCode: string;
};

export function EditorFeedback({
  messageCode,
  errorCode,
}: EditorFeedbackProps) {
  return (
    <>
      {messageCode ? (
        <p
          className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-800"
          role="status"
        >
          {successMessages[messageCode] ?? "The content was updated."}
        </p>
      ) : null}
      {errorCode ? (
        <p
          className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
          role="alert"
        >
          {errorMessages[errorCode] ??
            "The content action could not be completed."}
        </p>
      ) : null}
    </>
  );
}
