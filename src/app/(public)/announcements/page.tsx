import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcements" };

export { default } from "@/frontend/screens/public/announcements/index";
