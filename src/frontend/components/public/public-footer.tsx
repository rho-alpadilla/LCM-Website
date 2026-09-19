import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/shared/config/site";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div aria-hidden="true" className="grid h-1 grid-cols-4">
        <span className="bg-blue-800" />
        <span className="bg-green-600" />
        <span className="bg-yellow-300" />
        <span className="bg-red-700" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              alt=""
              className="h-10 w-10 rounded-lg bg-white object-cover"
              height={40}
              src="/brand/lcm-mark.webp"
              width={40}
            />
            <p className="font-black text-white">{siteConfig.name}</p>
          </div>
          <p className="mt-3 max-w-xs leading-6">
            To love God and to love people.
          </p>
        </div>
        <div>
          <p className="font-bold text-yellow-300">Explore</p>
          <ul className="mt-2 grid gap-1 leading-6">
            <li>
              <Link className="hover:text-white hover:underline" href="/about">
                About LCM
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white hover:underline"
                href="/ministries"
              >
                Ministries
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white hover:underline"
                href="/activities"
              >
                Church calendar
              </Link>
            </li>
          </ul>
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
