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
    <div className="public-site">
      <a className="public-skip-link" href="#main-content">
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
    <section className="public-intro">
      <div className="public-container">
        <p className="public-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="public-intro-description">{description}</p>
      </div>
    </section>
  );
}

export function EmptyContent({ children }: { children: ReactNode }) {
  return <p className="public-empty">{children}</p>;
}
