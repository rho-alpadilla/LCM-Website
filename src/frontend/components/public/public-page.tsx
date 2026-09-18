import type { ReactNode } from "react";

import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-bold text-blue-900 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#main-content"
      >
        Skip to main content
      </a>
      <PublicHeader />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="bg-[linear-gradient(120deg,#020617_0%,#1111a8_65%,#020617_100%)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          {description}
        </p>
      </div>
    </section>
  );
}

export function EmptyContent({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-700">
      {children}
    </p>
  );
}
