import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schemas";

export const personalInfoSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a name").max(80, "That name is too long"),
  dob: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => !v || new Date(v) <= new Date(), "Date of birth cannot be in the future")
    .optional()
    .or(z.literal("")),
  sex: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional().or(z.literal("")),
  relationship: z.string().trim().max(40).optional().or(z.literal("")),
});
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const healthProfileSchema = z.object({
  profileId: z.string().uuid(),
  conditions: z.string().trim().max(400).optional().or(z.literal("")),
  heightCm: z.coerce.number().int().min(30).max(260).optional().or(z.literal("")),
  weightKg: z.coerce.number().min(1).max(400).optional().or(z.literal("")),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal("")),
  // One line per medication, "Name | Dose | Frequency" — matched to the tri-part
  // shape already used by the mock fixtures rather than inventing a new one.
  medications: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type HealthProfileInput = z.infer<typeof healthProfileSchema>;

export const addMemberSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80, "That name is too long"),
  relationship: z.string().trim().min(1, "Say how they're related to you").max(40),
  dob: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => !v || new Date(v) <= new Date(), "Date of birth cannot be in the future")
    .optional()
    .or(z.literal("")),
  sex: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional().or(z.literal("")),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const SUPPORT_CATEGORIES = [
  "bug",
  "not_working",
  "billing",
  "account",
  "feature",
  "other",
] as const;

export const supportTicketSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().trim().min(3, "Give it a short title").max(140, "That title is too long"),
  body: z
    .string()
    .trim()
    .min(20, "Please add a little more detail — 20 characters at least")
    .max(4000, "That's longer than we can accept"),
});
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export const notificationPrefsSchema = z.object({
  accountSecurity: z.boolean(),
  productUpdates: z.boolean(),
  tipsReminders: z.boolean(),
  checkinReminders: z.boolean(),
  healthInsights: z.boolean(),
  reportNotifications: z.boolean(),
  familyActivity: z.boolean(),
  invitations: z.boolean(),
  promotions: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
