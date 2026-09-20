import Link from "next/link";
import { siteConfig } from "@/shared/config/site";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-grid">
          <div>
            <p className="public-footer-brand">Lifechangers.</p>
            <p className="public-footer-caption">{siteConfig.name}</p>
            <p className="public-footer-passion">
              To love God and to love people.
            </p>
          </div>
          <div>
            <p className="public-eyebrow">Church</p>
            <ul className="public-footer-links">
              <li>
                <Link href="/about">About LCM</Link>
              </li>
              <li>
                <Link href="/ministries">Ministries</Link>
              </li>
              <li>
                <Link href="/activities">Church calendar</Link>
              </li>
              <li>
                <Link href="/bulletins">Bulletins</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="public-eyebrow">Connect</p>
            <ul className="public-footer-links">
              <li>
                <Link href="/contact">Contact the church</Link>
              </li>
              <li>
                <Link href="/prayer">Request prayer</Link>
              </li>
              <li>
                <Link href="/join">Join a ministry</Link>
              </li>
              <li>
                <Link href="/give">Give tithes &amp; offerings</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="public-eyebrow">Find us</p>
            <address>{siteConfig.contact.address}</address>
            <a
              className="public-footer-contact"
              href={`tel:${siteConfig.contact.phone}`}
            >
              {siteConfig.contact.phone}
            </a>
            <a
              className="public-footer-contact"
              href={`mailto:${siteConfig.contact.email}`}
            >
              {siteConfig.contact.email}
            </a>
          </div>
        </div>
        <div className="public-footer-bottom">
          <span>Baguio City, Philippines</span>
          <a
            href={siteConfig.contact.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            LCM on Facebook <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
