import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visitor inquiries" };

export { default } from "@/frontend/screens/admin/inquiries/index";
