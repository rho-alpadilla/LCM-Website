import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daily Activities" };

export { default } from "@/frontend/screens/public/activities/index";
