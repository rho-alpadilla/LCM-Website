import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ministry" };

export { default } from "@/frontend/screens/public/ministries/detail";
