import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
