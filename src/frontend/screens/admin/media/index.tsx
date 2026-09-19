import { AdminHeader } from "@/frontend/components/admin/admin-header";
import { getMediaWorkspace } from "@/backend/queries/media/admin-library";
import { uploadMediaAction } from "@/backend/actions/media";
import { formatMegabytes, mediaPolicy } from "@/shared/media/policy";

const errors: Record<string, string> = {
  invalid_upload: "Choose a valid upload category and file.",
  upload_failed:
    "The upload failed. Check the file type, size, image description, and storage allowance.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MediaPage({ searchParams }: Props) {
  const [state, parameters] = await Promise.all([
    getMediaWorkspace(),
    searchParams,
  ]);
  const { assets } = state;
  const message =
    typeof parameters.message === "string" ? parameters.message : "";
  const error = typeof parameters.error === "string" ? parameters.error : "";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader context={state.context} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          R2 media library
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Images and bulletins
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Files are validated on the server, stored under generated names, and
          kept private until approved content references them.
        </p>

        {message ? (
          <p
            className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-800"
            role="status"
          >
            The file was uploaded and is ready to select in a content editor.
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
            role="alert"
          >
            {errors[error] ?? "The upload could not be completed."}
          </p>
        ) : null}

        <section
          className="mt-10 grid gap-6 lg:grid-cols-2"
          aria-label="Upload files"
        >
          <UploadCard
            accept="image/jpeg,image/png,image/webp,image/avif"
            description="JPEG, PNG, WebP, or AVIF. Add meaningful alt text unless the image is purely decorative."
            label="Upload an image"
            maximum={mediaPolicy.imageMaxBytes}
            scope="public_content"
          />
          <UploadCard
            accept="application/pdf"
            description="PDF bulletins are stored privately and will be served as downloads, not embedded documents."
            label="Upload a bulletin PDF"
            maximum={mediaPolicy.bulletinPdfMaxBytes}
            scope="bulletins"
          />
        </section>

        <section className="mt-12" aria-labelledby="media-list-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                className="text-2xl font-black text-slate-950"
                id="media-list-title"
              >
                Ready files
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Internal ceiling:{" "}
                {formatMegabytes(mediaPolicy.totalStorageMaxBytes)}.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-600">
              {assets.length} file{assets.length === 1 ? "" : "s"}
            </span>
          </div>
          {assets.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={asset.id}
                >
                  <p className="text-xs font-bold tracking-wider text-blue-800 uppercase">
                    {asset.storageScope === "bulletins"
                      ? "Bulletin PDF"
                      : "Public content image"}
                  </p>
                  <h3 className="mt-2 font-black break-words text-slate-950">
                    {asset.originalName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {asset.mimeType} · {formatFileSize(asset.sizeBytes)}
                  </p>
                  {asset.altText ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Alt text: {asset.altText}
                    </p>
                  ) : null}
                  {asset.isDecorative ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Marked decorative
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
              No ready media has been uploaded yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function UploadCard({
  accept,
  description,
  label,
  maximum,
  scope,
}: {
  accept: string;
  description: string;
  label: string;
  maximum: number;
  scope: "public_content" | "bulletins";
}) {
  const isImage = scope === "public_content";
  return (
    <form
      action={uploadMediaAction}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <input name="storageScope" type="hidden" value={scope} />
      <h2 className="text-xl font-black text-slate-950">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description} Maximum {formatMegabytes(maximum)}.
      </p>
      <label className="mt-5 block font-semibold text-slate-800">
        Choose file
        <input
          className="mt-2 block w-full rounded-xl border border-slate-300 p-3"
          accept={accept}
          name="file"
          required
          type="file"
        />
      </label>
      {isImage ? (
        <>
          <label className="mt-5 block font-semibold text-slate-800">
            Image description
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3"
              maxLength={500}
              name="altText"
            />
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-slate-700">
            <input
              className="mt-1"
              name="isDecorative"
              type="checkbox"
              value="yes"
            />
            This image is decorative and communicates no information.
          </label>
        </>
      ) : (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Automated malware scanning is not available in the zero-cost stack.
          Upload only PDFs created or verified by the church bulletin team.
        </p>
      )}
      <button
        className="mt-5 w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        type="submit"
      >
        Upload securely
      </button>
    </form>
  );
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
