import { ageOn, checkDob, checkEmail, checkMobile, checkName, genderFrom, type Gender } from "./validate";

/*
 * ONE PATIENT, THREE APIS.
 *
 * Labs, pharmacy and consultations all carry the same patient. This turns a
 * family member's profile into LabStack's fields, and says which ones are
 * missing so the checkout asks only for those. Family members go as
 * dependants of the account holder (`mainUserUniqueId` + `relationship`),
 * so LabStack keeps one family, like we do.
 *
 * Email and mobile: we don't keep them per member. The account holder's are
 * used unless the member has their own phone (owner's decision, 16 Nov 2026),
 * and both can be changed at checkout.
 */

export type ProfileLike = { id: string; name: string; dob: string | null; sex: string | null; relationship: string | null; isPrimary: boolean; phone?: string | null };

export type Relationship =
  | "OTHER" | "HUSBAND" | "WIFE" | "FATHER" | "MOTHER" | "SON" | "DAUGHTER" | "GRANDFATHER" | "GRANDMOTHER"
  | "BROTHER" | "SISTER" | "PARTNER";

export type Patient = {
  uniqueId: string;
  name: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  age: number | null;
  mobile: string;
  email: string;
  altContact: string | null;
  mainUserUniqueId: string | null;
  relationship: Relationship | null;
};

export type PatientField = "name" | "gender" | "dateOfBirth" | "mobile" | "email";

/** Our relationship words (family/add) to LabStack's, using sex where the word doesn't say. */
export function relationshipFor(rel: string | null, sex: string | null): Relationship {
  const r = (rel ?? "").toLowerCase();
  const female = sex === "female";
  const male = sex === "male";
  if (r === "mother") return "MOTHER";
  if (r === "father") return "FATHER";
  if (r === "son") return "SON";
  if (r === "daughter") return "DAUGHTER";
  if (r === "sister") return "SISTER";
  if (r === "brother") return "BROTHER";
  if (r === "wife") return "WIFE";
  if (r === "husband") return "HUSBAND";
  if (r === "spouse") return female ? "WIFE" : male ? "HUSBAND" : "PARTNER";
  if (r === "grandparent" || r === "grandmother" || r === "grandfather") return r === "grandmother" || female ? "GRANDMOTHER" : r === "grandfather" || male ? "GRANDFATHER" : "OTHER";
  if (r === "child") return female ? "DAUGHTER" : male ? "SON" : "OTHER";
  return "OTHER";
}

/**
 * The patient for one member. `holder` is the account holder (for email,
 * mobile and the family link). Edits made at checkout win over the profile.
 */
export function patientFor(member: ProfileLike, holder: ProfileLike | null, account: { email: string | null; phone: string | null }, edits: Partial<Record<PatientField, string>> = {}, today: Date = new Date()): { patient: Patient; missing: PatientField[]; errors: Partial<Record<PatientField, string>> } {
  const errors: Partial<Record<PatientField, string>> = {};
  const missing: PatientField[] = [];

  const name = checkName(edits.name ?? member.name);
  if (!name.ok) errors.name = name.error;

  const gender = (edits.gender as Gender | undefined) ?? genderFrom(member.sex);
  if (!gender) missing.push("gender");

  const dobRaw = edits.dateOfBirth ?? member.dob ?? "";
  let dateOfBirth: string | null = null;
  if (!dobRaw) missing.push("dateOfBirth");
  else {
    const d = checkDob(dobRaw, today);
    if (d.ok) dateOfBirth = d.value;
    else errors.dateOfBirth = d.error;
  }

  const phoneRaw = edits.mobile ?? member.phone ?? account.phone ?? holder?.phone ?? "";
  const mobile = checkMobile(phoneRaw);
  if (!phoneRaw) missing.push("mobile");
  else if (!mobile.ok) errors.mobile = mobile.error;

  const emailRaw = edits.email ?? account.email ?? "";
  const email = checkEmail(emailRaw);
  if (!emailRaw) missing.push("email");
  else if (!email.ok) errors.email = email.error;

  // Booking for someone else: the account holder's number is the backup contact.
  const holderPhone = holder && !member.isPrimary ? checkMobile(account.phone ?? holder.phone ?? "") : null;
  const dependant = !member.isPrimary && holder;

  return {
    patient: {
      uniqueId: member.id,
      name: name.ok ? name.value : "",
      gender: gender ?? null,
      dateOfBirth,
      age: dateOfBirth ? ageOn(dateOfBirth, today) : null,
      mobile: mobile.ok ? mobile.value : "",
      email: email.ok ? email.value : "",
      altContact: holderPhone?.ok && mobile.ok && holderPhone.value !== mobile.value ? holderPhone.value : null,
      mainUserUniqueId: dependant ? holder.id : null,
      relationship: dependant ? relationshipFor(member.relationship, member.sex) : null,
    },
    missing,
    errors,
  };
}

/** Ready to send: nothing missing, nothing wrong. */
export function patientReady(r: ReturnType<typeof patientFor>): boolean {
  return r.missing.length === 0 && Object.keys(r.errors).length === 0;
}
