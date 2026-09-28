"use client";

import { useSyncExternalStore } from "react";

const themeStorageKey = "lcm-theme";
const themeChangeEvent = "lcm-theme-change";

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => false,
  );

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(themeStorageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="public-theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <SunIcon />
      <MoonIcon />
      <span className="sr-only">
        Switch to {isDark ? "light" : "dark"} mode
      </span>
    </button>
  );
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => window.removeEventListener(themeChangeEvent, onStoreChange);
}

function getThemeSnapshot() {
  return document.documentElement.dataset.theme === "dark";
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="public-theme-sun" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93 6.7 6.7m10.6 10.6 1.77 1.77M2 12h2.5m15 0H22M4.93 19.07 6.7 17.3m10.6-10.6 1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="public-theme-moon" viewBox="0 0 24 24">
      <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
    </svg>
  );
}
