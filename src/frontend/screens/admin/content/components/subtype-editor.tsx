import type { Route } from "next";
import Link from "next/link";

import {
  MinistrySubtypeForm,
  SeriesSubtypeForm,
  SpeakerSubtypeForm,
} from "./identity-subtype-forms";
import {
  AnnouncementSubtypeForm,
  BulletinSubtypeForm,
  SermonSubtypeForm,
} from "./publication-subtype-forms";
import { ScheduleSubtypeForm } from "./schedule-subtype-form";
import type { ContentSubtypeFormData } from "./subtype-form-helpers";

export function ContentSubtypeEditor(data: ContentSubtypeFormData) {
  const { content, mediaAssets } = data;

  if (content.contentType === "page") {
    return (
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-600">
        Pages use the shared title, summary, and body fields only.
      </p>
    );
  }

  if (content.contentType === "bulletin" && !hasBulletinFile(data)) {
    return <MissingBulletinFileNotice />;
  }

  switch (content.contentType) {
    case "ministry":
      return <MinistrySubtypeForm {...data} />;
    case "series":
      return <SeriesSubtypeForm {...data} />;
    case "speaker":
      return <SpeakerSubtypeForm {...data} />;
    case "sermon":
      return <SermonSubtypeForm {...data} />;
    case "announcement":
      return <AnnouncementSubtypeForm {...data} />;
    case "bulletin":
      return <BulletinSubtypeForm {...data} />;
    case "schedule":
      return <ScheduleSubtypeForm {...data} />;
  }
}

function hasBulletinFile({ subtype, mediaAssets }: ContentSubtypeFormData) {
  return (
    Boolean(subtype) ||
    mediaAssets.some((asset) => asset.storageScope === "bulletins")
  );
}

function MissingBulletinFileNotice() {
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">Upload a bulletin PDF first.</p>
      <p className="mt-1 text-sm leading-6">
        Bulletin details require a validated PDF from the private media library.
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
