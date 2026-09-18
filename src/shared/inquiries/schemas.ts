import { z } from "zod";

import type { InquiryType } from "./types";

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const publicInquirySchema = z
  .object({
    inquiryType: z.enum(["contact", "ministry_interest"]),
    ministryContentId: z.uuid().nullable(),
    name: z.string().trim().min(2).max(120),
    email: z
      .union([z.literal(""), z.email().max(254)])
      .transform((value) => value || null),
    phone: nullableText(40).refine(
      (value) => value === null || value.length >= 7,
      "Enter a valid phone number.",
    ),
    preferredContact: z.enum(["email", "phone"]),
    followUpConsent: z.literal(true),
    message: nullableText(2000),
  })
  .superRefine((value, context) => {
    if (value.preferredContact === "email" && !value.email) {
      context.addIssue({
        code: "custom",
        message: "An email is required for email follow-up.",
      });
    }
    if (value.preferredContact === "phone" && !value.phone) {
      context.addIssue({
        code: "custom",
        message: "A phone number is required for phone follow-up.",
      });
    }
    if (value.inquiryType === "contact" && !value.message) {
      context.addIssue({
        code: "custom",
        message: "Tell us how we can help.",
        path: ["message"],
      });
    }
  });

export type PublicInquiryInput = z.infer<typeof publicInquirySchema>;

export const inquiryUpdateSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  updateType: z.enum(["note", "responded"]),
});

export const inquiryCloseSchema = z.object({
  note: z.string().trim().min(10).max(2000),
});

export function inquiryPermission(
  inquiryType: InquiryType,
  action: "read" | "respond" | "assign",
) {
  return `${inquiryType === "contact" ? "contact" : "ministry_interest"}.${action}`;
}
