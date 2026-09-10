"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-6">
      <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold tracking-widest text-red-700 uppercase">
          Administration error
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          We could not load this area
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          No changes were hidden or assumed successful. Please retry; if this
          continues, ask the System Administrator to check the deployment logs.
        </p>
        <button
          className="mt-6 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
