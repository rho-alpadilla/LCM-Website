import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-semibold tracking-widest text-blue-800 uppercase">
        404
      </p>
      <h1 className="mt-3 text-4xl font-black text-slate-950">
        We could not find that page.
      </h1>
      <p className="mt-4 text-lg text-slate-700">
        The link may be outdated, or the page may have moved.
      </p>
      <Link className="mt-8 font-semibold text-blue-800 underline" href="/">
        Return home
      </Link>
    </main>
  );
}
