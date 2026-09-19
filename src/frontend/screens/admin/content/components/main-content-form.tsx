import { updateContentDraftAction } from "@/backend/actions/content";
import type { ContentEntry } from "@/shared/content/types";
import type { MediaAssetListItem } from "@/shared/media/types";

import { formInputClass, FormField } from "./form-field";

type MainContentFormProps = {
  content: ContentEntry;
  readyImages: MediaAssetListItem[];
};

export function MainContentForm({
  content,
  readyImages,
}: MainContentFormProps) {
  return (
    <form
      action={updateContentDraftAction}
      className="mt-6 grid gap-5 sm:grid-cols-2"
    >
      <input name="contentId" type="hidden" value={content.id} />
      <FormField label="Title">
        <input
          className={formInputClass}
          defaultValue={content.title}
          maxLength={180}
          name="title"
          required
        />
      </FormField>
      <FormField label="Web address slug">
        <input
          className={formInputClass}
          defaultValue={content.slug}
          maxLength={180}
          name="slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
      </FormField>
      <FormField label="Short summary (optional)" wide>
        <textarea
          className={`${formInputClass} min-h-24`}
          defaultValue={content.summary ?? ""}
          maxLength={500}
          name="summary"
        />
      </FormField>
      <FormField
        label="Cover image (optional)"
        hint="Choose a validated image from the media library."
        wide
      >
        <select
          className={formInputClass}
          defaultValue={content.coverMediaId ?? ""}
          name="coverMediaId"
        >
          <option value="">No cover image</option>
          {readyImages.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalName}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="Body"
        hint="Plain text for the first launch. Rich text is not enabled yet."
        wide
      >
        <textarea
          className={`${formInputClass} min-h-64`}
          defaultValue={content.body.text}
          maxLength={50000}
          name="bodyText"
        />
      </FormField>
      <button
        className="rounded-xl bg-blue-800 px-5 py-3 font-bold text-white sm:col-span-2"
        type="submit"
      >
        Save main content
      </button>
    </form>
  );
}
