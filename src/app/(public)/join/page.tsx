import type { Metadata } from "next";

import JoinMinistryPage from "@/frontend/screens/public/join";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join a Ministry" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ministry?: string }>;
}) {
  const { ministry } = await searchParams;
  return <JoinMinistryPage selectedMinistrySlug={ministry ?? null} />;
}
