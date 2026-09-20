import Image from "next/image";
import Link from "next/link";
import { PublicPage } from "@/frontend/components/public/public-page";

const churchLinks = [
  {
    href: "/ministries",
    title: "Find your ministry",
    detail: "Connect. Grow. Serve.",
  },
  {
    href: "/activities",
    title: "Church calendar",
    detail: "Make room for community.",
  },
  {
    href: "/announcements",
    title: "Latest updates",
    detail: "Stay connected to church life.",
  },
] as const;

export default function HomePage() {
  return (
    <PublicPage headerVariant="hero">
      <section className="home-hero" aria-labelledby="home-title">
        <Image
          alt="Lifechangers Ministry church family gathered together."
          src="/images/home/lcm-church-family.jpg"
          fill
          preload
          sizes="100vw"
          className="home-hero-photo"
        />
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-content">
          <p className="home-hero-eyebrow">
            Lifechangers Ministry · Baguio City
          </p>
          <h1 id="home-title">
            Love God.
            <br />
            <span>Love people.</span>
          </h1>
          <p className="home-hero-script">Church without walls</p>
          <div className="home-hero-actions">
            <Link className="public-button public-button-light" href="/sermons">
              <PlayIcon />
              Watch a sermon
            </Link>
            <Link
              className="public-button public-button-glass"
              href="/activities"
            >
              See what’s happening<span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="home-hero-bottom">
          <span>One church. One family.</span>
          <a href="#church-life" aria-label="Explore church life">
            Explore <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section
        className="public-container home-church-life"
        id="church-life"
        aria-labelledby="church-life-title"
      >
        <div className="home-section-heading">
          <div>
            <p className="public-eyebrow">Life at LCM</p>
            <h2 id="church-life-title">Faith, lived together.</h2>
          </div>
          <Link className="public-text-link" href="/about">
            Our story <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="home-church-links">
          {churchLinks.map((item, index) => (
            <Link className="home-church-link" href={item.href} key={item.href}>
              <span className="home-link-number" aria-hidden="true">
                0{index + 1}
              </span>
              <h3>{item.title}</h3>
              <span className="home-link-bottom">
                <span>{item.detail}</span>
                <span className="home-link-arrow" aria-hidden="true">
                  ↗
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-prayer" aria-labelledby="home-prayer-title">
        <div className="public-container home-prayer-inner">
          <div>
            <p className="public-eyebrow">Here for you</p>
            <h2 id="home-prayer-title">Let’s pray together.</h2>
          </div>
          <Link className="public-button public-button-dark" href="/prayer">
            Request prayer <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M4 2.5a.5.5 0 0 1 .76-.43l9 5.5a.5.5 0 0 1 0 .86l-9 5.5A.5.5 0 0 1 4 13.5z" />
    </svg>
  );
}
