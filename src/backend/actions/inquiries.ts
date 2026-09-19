"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { InquiryRepository } from "@/backend/repositories/inquiry-repository";
import { InquiryService } from "@/backend/services/inquiry-service";

const idSchema = z.uuid();

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function detailPath(inquiryId: string, result: string) {
  return `/admin/inquiries/${inquiryId}?${result}` as Route;
}

async function context(formData: FormData) {
  const inquiryId = idSchema.safeParse(text(formData, "inquiryId"));
  if (!inquiryId.success) {
    redirect("/admin/inquiries?error=invalid_inquiry" as Route);
  }
  const state = await requireActiveStaffSession();
  return {
    state,
    inquiryId: inquiryId.data,
    service: new InquiryService({
      repository: new InquiryRepository(state.environment.DB),
    }),
  };
}

function revalidateInquiryPages(inquiryId: string) {
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function assignInquiryAction(formData: FormData) {
  const { state, inquiryId, service } = await context(formData);
  try {
    await service.assign(
      state.context,
      inquiryId,
      text(formData, "assignedTo"),
    );
    revalidateInquiryPages(inquiryId);
  } catch {
    redirect(detailPath(inquiryId, "error=assign_failed"));
  }
  redirect(detailPath(inquiryId, "message=assigned"));
}

export async function addInquiryUpdateAction(formData: FormData) {
  const { state, inquiryId, service } = await context(formData);
  try {
    await service.addUpdate(state.context, inquiryId, {
      updateType: text(formData, "updateType"),
      note: text(formData, "note"),
    });
    revalidateInquiryPages(inquiryId);
  } catch {
    redirect(detailPath(inquiryId, "error=update_failed"));
  }
  redirect(detailPath(inquiryId, "message=updated"));
}

export async function closeInquiryAction(formData: FormData) {
  const { state, inquiryId, service } = await context(formData);
  try {
    await service.close(state.context, inquiryId, {
      note: text(formData, "note"),
    });
    revalidateInquiryPages(inquiryId);
  } catch {
    redirect(detailPath(inquiryId, "error=close_failed"));
  }
  redirect(detailPath(inquiryId, "message=closed"));
}
