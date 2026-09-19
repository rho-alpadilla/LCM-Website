import { siteConfig } from "@/shared/config/site";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="font-black text-white">{siteConfig.name}</p>
          <p className="mt-2 leading-6">To love God and to love people.</p>
        </div>
        <div>
          <p className="font-bold text-yellow-300">Connect</p>
          <address className="mt-2 leading-6 not-italic">
            {siteConfig.contact.address}
          </address>
          <a
            className="mt-2 block underline"
            href={`tel:${siteConfig.contact.phone}`}
          >
            {siteConfig.contact.phone}
          </a>
          <a
            className="mt-1 block underline"
            href={`mailto:${siteConfig.contact.email}`}
          >
            {siteConfig.contact.email}
          </a>
        </div>
        <div>
          <p className="font-bold text-yellow-300">Stay updated</p>
          <a
            className="mt-2 inline-block underline"
            href={siteConfig.contact.facebookUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Follow LCM Agents of Change
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="mt-3 leading-6">
            Service schedules are listed in the church calendar when confirmed.
          </p>
        </div>
      </div>
    </footer>
  );
}
