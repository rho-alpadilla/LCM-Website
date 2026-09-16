import { siteConfig } from "@/lib/config/site";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm sm:px-6">
        <p className="font-bold text-white">{siteConfig.name}</p>
        <p className="mt-2">To love God and to love people.</p>
      </div>
    </footer>
  );
}
