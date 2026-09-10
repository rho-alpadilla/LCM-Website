import { z } from "zod";

import { inviteRoleOptions, roleOptions } from "@/features/staff/roles";

const roleCodes = roleOptions.map(([code]) => code) as [string, ...string[]];
const inviteRoleCodes = inviteRoleOptions.map(([code]) => code) as [
  string,
  ...string[],
];

export const invitationSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.trim().toLowerCase()),
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
