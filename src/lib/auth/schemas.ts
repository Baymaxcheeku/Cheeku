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

export const CONSENT_VERSION = "1.1.0";

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
  /*
   * Phone numbers, for everywhere.
   *
   * The old rule was `/^[+]?[\d\s-]{7,18}$/`: a plus, digits, spaces and
   * hyphens, and a length counted in CHARACTERS. That rejects how much of the
   * world actually writes a number — "(020) 7946 0958" in the UK, "+1 (415)
   * 555-0132" in the US, "+49 (0)30 901820" in Germany — and it measured the
   * formatting rather than the number, so "+44 7700 900 123" (16 characters,
   * 13 digits) passed while "+44 (0) 7700 900 123" did not, for the same
   * number.
   *
   * It now accepts the punctuation people use and validates the DIGITS: 7 to
   * 15, the upper bound being E.164's maximum. No country list, because a
   * health app that cannot store a Kenyan or Brazilian number is not a global
   * product, and no attempt to guess a country from the prefix, which is how
   * you end up rejecting somebody's real number with total confidence.
   */
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^[+]?[\d\s().-]+$/.test(v), "Enter a valid phone number")
    .refine((v) => {
      if (!v) return true;
      const digits = v.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "Enter a valid phone number")
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
