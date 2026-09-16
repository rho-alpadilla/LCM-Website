"use client";

export default function PublicError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-red-700 uppercase">
        Temporary problem
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-950">
        This content could not be loaded.
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Please try again. If the problem continues, the church team can check
        the site logs without exposing private details here.
      </p>
      <button
        className="mx-auto mt-7 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
