import { z } from "zod";

/*
 * Every auth and onboarding boundary validates through these. The same schema
 * is used by the client form and the server action, so a bypassed client
 * control cannot widen what the server accepts.
 */

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

/*
 * Length beats composition rules: NIST dropped the mixed-character requirement
 * because it pushes people toward predictable substitutions.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use fewer than 128 characters");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const CONSENT_VERSION = "1.0.0";

export const createAccountSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // DPDP Act: consent must be explicit and unticked by default. Rejecting the
  // literal `true` is what makes an unticked box fail validation.
  consent: z.literal(true, { message: "Please accept the privacy terms to continue" }),
});

export const audienceSchema = z.object({
  audience: z.enum(["me", "family"]),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a name").max(80, "That name is too long"),
  dob: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => !v || new Date(v) <= new Date(), "Date of birth cannot be in the future")
    .optional()
    .or(z.literal("")),
  sex: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s-]{7,18}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  // Data minimisation: the health snapshot is genuinely optional, so blanks are
  // valid rather than being coerced to zero.
  heightCm: z.coerce.number().int().min(30).max(260).optional().or(z.literal("")),
  weightKg: z.coerce.number().min(1).max(400).optional().or(z.literal("")),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().or(z.literal("")),
  conditions: z.string().trim().max(400).optional().or(z.literal("")),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Shape returned by every auth server action. */
export type ActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
