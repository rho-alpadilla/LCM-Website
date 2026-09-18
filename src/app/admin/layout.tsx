import type { ReactNode } from "react";

import { localDevelopmentIsActiveForCurrentRequest } from "@/backend/queries/local-development";
import { LocalDevelopmentNotice } from "@/frontend/components/admin/local-development-notice";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const localDevelopmentIsActive =
    await localDevelopmentIsActiveForCurrentRequest();
  return (
    <>
      {localDevelopmentIsActive ? <LocalDevelopmentNotice /> : null}
      {children}
    </>
  );
}
