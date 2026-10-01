import type { BirthContext, Dating, Pregnancy, Relation, RelationType, Subject, SubjectStatus } from "./types";

/*
 * THE SUBJECT GRAPH.
 *
 * Not "a user": a household of linked people whose relationships change.
 * The non-obvious part is promotion. A baby exists as a pregnancy inside the
 * mother's timeline from the first scan, and at birth becomes a person of
 * their own, CARRYING what the pregnancy knew: the mother's blood group, how
 * they were delivered, how many weeks along, and what the mother was taking
 * in the last weeks. That inheritance is what lets day-3 jaundice be read
 * against "mother O, baby A" without anyone typing it twice.
 *
 * Rule 4 (never show one member's data in another's context) holds, with one
 * declared exception: the relation's blood group, and the birth context copied
 * at promotion, which is shown on the baby's page with where it came from.
 */

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null) : []);

const RELATIONS: readonly RelationType[] = ["mother", "father", "parent", "child", "spouse", "sibling", "other"];
const STATUSES: readonly SubjectStatus[] = ["active", "gestational", "archived"];

export function readBirth(v: unknown): BirthContext | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Row;
  return {
    pregnancyId: str(o.pregnancy_id ?? o.pregnancyId),
    motherId: str(o.mother_id ?? o.motherId),
    gaAtBirthDays: num(o.ga_at_birth_days ?? o.gaAtBirthDays),
    deliveryMode: str(o.delivery_mode ?? o.deliveryMode),
    birthWeightKg: num(o.birth_weight_kg ?? o.birthWeightKg),
    maternalBloodGroup: str(o.maternal_blood_group ?? o.maternalBloodGroup),
    inUteroMedicines: strs(o.in_utero_medicines ?? o.inUteroMedicines),
  };
}

export function readSubject(p: Row, relations: readonly Row[] = []): Subject {
  const name = str(p.name) ?? "Member";
  return {
    id: String(p.id),
    name,
    firstName: name.split(/\s+/)[0] ?? name,
    dob: str(p.dob),
    sex: str(p.sex),
    bloodGroup: str(p.blood_group),
    countryOfCare: str(p.country_of_care),
    status: STATUSES.includes(p.status as SubjectStatus) ? (p.status as SubjectStatus) : "active",
    relationship: str(p.relationship),
    isPrimary: p.is_primary === true,
    conditions: strs(p.conditions),
    allergies: strs(p.allergies),
    relations: relations.map(readRelation).filter((r): r is Relation => r !== null),
    birth: readBirth(p.birth),
  };
}

function readRelation(r: Row): Relation | null {
  const id = str(r.related_profile_id ?? r.subjectId);
  if (!id) return null;
  return {
    subjectId: id,
    type: RELATIONS.includes(r.type as RelationType) ? (r.type as RelationType) : "other",
    name: str(r.name) ?? "Family member",
    bloodGroup: str(r.blood_group ?? r.bloodGroup),
  };
}

export function readPregnancy(r: Row): Pregnancy {
  const datings: Dating[] = Array.isArray(r.datings)
    ? (r.datings as Row[])
        .map((d) => ({
          date: str(d.date) ?? "",
          gaDays: num(d.ga_days ?? d.gaDays) ?? -1,
          source: (d.source === "lmp" || d.source === "clinician" ? d.source : "scan") as Dating["source"],
          label: str(d.label),
          documentId: str(d.document_id ?? d.documentId),
        }))
        .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d.date) && d.gaDays >= 0)
    : [];
  return {
    id: String(r.id),
    profileId: String(r.profile_id ?? r.profileId),
    lmp: str(r.lmp),
    edd: str(r.edd),
    datings,
    babyName: str(r.baby_name ?? r.babyName),
    status: r.status === "delivered" || r.status === "ended" ? r.status : "ongoing",
    deliveredOn: str(r.delivered_on ?? r.deliveredOn),
    deliveryMode: str(r.delivery_mode ?? r.deliveryMode),
    childProfileId: str(r.child_profile_id ?? r.childProfileId),
  };
}

/** The mother, when the graph knows one. */
export function motherOf(s: Subject): Relation | null {
  return s.relations.find((r) => r.type === "mother") ?? null;
}

/**
 * What a newborn inherits at promotion. Built here so the RPC and the app
 * agree on it; `promote_pregnancy` in migration 0030 stores the same shape.
 */
export function inheritAtBirth(
  mother: Pick<Subject, "id" | "bloodGroup">,
  pregnancy: Pregnancy,
  birth: { date: string; deliveryMode: string | null; weightKg: number | null },
  gaAtBirthDays: number | null,
  motherMedicines: readonly string[],
): BirthContext {
  return {
    pregnancyId: pregnancy.id,
    motherId: mother.id,
    gaAtBirthDays,
    deliveryMode: birth.deliveryMode,
    birthWeightKg: birth.weightKg,
    maternalBloodGroup: mother.bloodGroup,
    inUteroMedicines: [...motherMedicines],
  };
}

/*
 * Blood groups that make a newborn's jaundice worth reading with the mother
 * in mind. ABO: mother O, baby A or B. Rh: mother negative, baby positive.
 * This names a mechanism to raise with the paediatrician; it does not say
 * the baby has it.
 */
export function bloodGroupNote(baby: Pick<Subject, "bloodGroup" | "birth">, motherGroup: string | null): string | null {
  const m = (motherGroup ?? baby.birth?.maternalBloodGroup ?? "").toUpperCase().replace(/\s/g, "");
  const b = (baby.bloodGroup ?? "").toUpperCase().replace(/\s/g, "");
  if (!m || !b) return null;
  const mAbo = m.replace(/[+-]|POS|NEG|VE/g, "");
  const bAbo = b.replace(/[+-]|POS|NEG|VE/g, "");
  const mNeg = /-|NEG/.test(m);
  const bPos = /\+|POS/.test(b);
  if (mAbo === "O" && (bAbo === "A" || bAbo === "B" || bAbo === "AB")) {
    return `Mother is ${m} and baby is ${b}. A blood group mismatch like this is one of the common reasons newborn jaundice runs higher, so it is worth mentioning to the paediatrician with any bilirubin result.`;
  }
  if (mNeg && bPos) {
    return `Mother is Rh negative (${m}) and baby is Rh positive (${b}). Worth making sure the paediatrician has this alongside any bilirubin result.`;
  }
  return null;
}
