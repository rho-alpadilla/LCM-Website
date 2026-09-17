import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sermon" };

export { default } from "@/frontend/screens/public/sermons/detail";
