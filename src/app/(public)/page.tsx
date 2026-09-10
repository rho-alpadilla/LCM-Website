import { siteConfig } from "@/lib/config/site";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-6 py-16 sm:px-10 lg:px-16">
        <p className="w-fit rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          Development foundation
        </p>

        <div className="max-w-4xl space-y-5">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            {siteConfig.name}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
            {siteConfig.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.initialActions.map((action) => (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              key={action}
            >
              <p className="font-semibold text-slate-900">{action}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Planned feature — not connected yet.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
