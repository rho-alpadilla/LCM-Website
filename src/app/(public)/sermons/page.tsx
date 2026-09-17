import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sermons" };

export { default } from "@/frontend/screens/public/sermons/index";
