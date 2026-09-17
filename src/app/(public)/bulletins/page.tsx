import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bulletins" };

export { default } from "@/frontend/screens/public/bulletins/index";
