import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@/shared/config/site";

import "./globals.css";

const themeInitializationScript = `(() => {
  try {
    const savedTheme = localStorage.getItem("lcm-theme");
    const prefersDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = savedTheme ?? (prefersDarkTheme ? "dark" : "light");
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
