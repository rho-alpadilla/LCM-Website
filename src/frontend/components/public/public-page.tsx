import type { ReactNode } from "react";

import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
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
    <section className="relative isolate overflow-hidden bg-[linear-gradient(120deg,#020617_0%,#1111a8_58%,#080c35_100%)] text-white">
      <div
        aria-hidden="true"
        className="absolute -top-24 right-[14%] h-72 w-72 rounded-full bg-yellow-300/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-2 w-1/4 bg-blue-800"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/4 h-2 w-1/4 bg-green-600"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-2/4 h-2 w-1/4 bg-yellow-300"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 h-2 w-1/4 bg-red-700"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
          {description}
        </p>
      </div>
    </section>
  );
}

export function EmptyContent({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 leading-7 text-slate-700">
      {children}
    </p>
  );
}
