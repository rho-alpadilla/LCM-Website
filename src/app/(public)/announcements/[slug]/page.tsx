import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Announcement" };

export { default } from "@/frontend/screens/public/announcements/detail";
