import { z } from "zod";

import {
  inviteRoleOptions,
  roleOptions,
  type RoleCode,
} from "@/features/staff/roles";

const roleCodes = roleOptions.map(([code]) => code) as [
  RoleCode,
  ...RoleCode[],
];
const inviteRoleCodes = inviteRoleOptions.map(([code]) => code) as [
  Exclude<RoleCode, "core_leader">,
  ...Exclude<RoleCode, "core_leader">[],
];

export const invitationSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  roleCode: z.enum(inviteRoleCodes),
  reason: z.string().trim().max(500).optional().default(""),
});

export const roleChangeSchema = z.object({
  staffId: z.uuid(),
  roleCode: z.enum(roleCodes),
  reason: z.string().trim().max(500).optional().default(""),
});

export const suspensionSchema = z.object({
  staffId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});
