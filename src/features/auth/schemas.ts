import { z } from "zod";

const strongPassword = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const passwordSetupSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const bootstrapSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(10).max(500),
});

export function safeInternalPath(value: string | null, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
