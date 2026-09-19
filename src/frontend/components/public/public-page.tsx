import type { ReactNode } from "react";

import { PublicFooter } from "./public-footer";
import { PublicHeader, type PublicHeaderVariant } from "./public-header";

export function PublicPage({
  children,
  headerVariant = "default",
}: {
  children: ReactNode;
  headerVariant?: PublicHeaderVariant;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#f7f4ed] text-slate-950">
      <a
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-bold text-blue-900 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#main-content"
      >
        Skip to main content
      </a>
      <PublicHeader variant={headerVariant} />
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
    <section className="border-b border-slate-950 bg-[#1111a8] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-end">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-yellow-300 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.045em] text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            {description}
          </p>
        </div>
        <div aria-hidden="true" className="hidden grid-cols-4 gap-2 lg:grid">
          <span className="h-20 bg-blue-800" />
          <span className="h-28 bg-green-600" />
          <span className="h-36 bg-yellow-300" />
          <span className="h-44 bg-red-700" />
        </div>
      </div>
    </section>
  );
}

export function EmptyContent({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-slate-500 bg-[#fffdf8] p-8 leading-7 text-slate-700">
      {children}
    </p>
  );
}
