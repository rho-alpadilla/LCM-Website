"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { PrayerRepository } from "@/backend/repositories/prayer-repository";
import { PrayerService } from "@/backend/services/prayer-service";

const idSchema = z.uuid();

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function detailPath(requestId: string, result: string) {
  return `/admin/prayer/${requestId}?${result}` as Route;
}

async function context(formData: FormData) {
  const requestId = idSchema.safeParse(text(formData, "requestId"));
  if (!requestId.success)
    redirect("/admin/prayer?error=invalid_request" as Route);
  const state = await requireActiveStaffSession("prayer.read_team");
  return {
    state,
    requestId: requestId.data,
    service: new PrayerService({
      repository: new PrayerRepository(state.environment.DB),
    }),
  };
}

export async function assignPrayerAction(formData: FormData) {
  const { state, requestId, service } = await context(formData);
  try {
    await service.assign(
      state.context,
      requestId,
      text(formData, "assignedTo"),
    );
    revalidatePath("/admin/prayer");
    revalidatePath(`/admin/prayer/${requestId}`);
  } catch {
    redirect(detailPath(requestId, "error=assign_failed"));
  }
  redirect(detailPath(requestId, "message=assigned"));
}

export async function addPrayerUpdateAction(formData: FormData) {
  const { state, requestId, service } = await context(formData);
  try {
    await service.addUpdate(state.context, requestId, {
      updateType: text(formData, "updateType"),
      note: text(formData, "note").trim() || null,
      visibilityScope: text(formData, "visibilityScope") || "team",
    });
    revalidatePath("/admin/prayer");
    revalidatePath(`/admin/prayer/${requestId}`);
  } catch {
    redirect(detailPath(requestId, "error=update_failed"));
  }
  redirect(detailPath(requestId, "message=updated"));
}

export async function closePrayerAction(formData: FormData) {
  const { state, requestId, service } = await context(formData);
  try {
    await service.close(
      state.context,
      requestId,
      text(formData, "reason").trim() || null,
    );
    revalidatePath("/admin/prayer");
    revalidatePath(`/admin/prayer/${requestId}`);
  } catch {
    redirect(detailPath(requestId, "error=close_failed"));
  }
  redirect(detailPath(requestId, "message=closed"));
}
