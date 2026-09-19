import "server-only";

import { requireActiveStaffSession } from "@/backend/auth/staff-context";
import { InquiryRepository } from "@/backend/repositories/inquiries/repository";
import { InquiryService } from "@/backend/services/inquiries/service";

export async function getInquiryQueue() {
  const { context, environment } = await requireActiveStaffSession();
  const service = new InquiryService({
    repository: new InquiryRepository(environment.DB),
  });
  return { context, inquiries: await service.listQueue(context) };
}

export async function getInquiryDetail(inquiryId: string) {
  const { context, environment } = await requireActiveStaffSession();
  const service = new InquiryService({
    repository: new InquiryRepository(environment.DB),
  });
  return { context, detail: await service.getDetail(context, inquiryId) };
}
