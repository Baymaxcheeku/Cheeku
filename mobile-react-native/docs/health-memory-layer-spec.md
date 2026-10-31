# Longitudinal Health Memory Layer — System Spec

Reverse-engineered from a 12-month continuous health thread covering three linked subjects (partner, self, newborn) across two countries, two healthcare systems, pregnancy → delivery → neonatal care.

This is what the chat layer actually did. Build this.

---

## 1. Core primitive: the Subject Graph

Not "a user." A household of linked subjects with relationships that change over time.

```
Subject {
  id, name, dob, blood_group, country_of_care
  relations: [{subject_id, type}]
  status: active | gestational | archived
}
```

Observed behaviour worth copying:
- A subject was **created from inside another subject's record**. Imaad existed as `gestational` inside Nisha's timeline from week 12, then promoted to `active` at birth with inherited context (maternal blood group, delivery mode, gestational age at birth, medications in utero).
- Blood group of one subject changed how a result on another was read (mother O + baby A = ABO incompatibility as a jaundice cause).

**Build:** subjects, relations, and a promotion event. Inheritance of relevant maternal fields on promotion is the non-obvious part.

---

## 2. Ingestion: everything is a document

Inputs over 12 months, in actual proportion:

| Type | Example | Extraction difficulty |
|---|---|---|
| Handwritten prescription | Dr Roy's notes, Bengali-English mix | Hardest. Partial extraction is fine, flag low-confidence fields |
| Printed lab report | CBC, LFT, GTT, bilirubin, TSH | Easy, highest value |
| Scan report | NT scan, anomaly scan, growth scan + Doppler | Structured tables, worth dedicated parsing |
| Medicine packaging | Drug vs FSSAI licence, composition, batch, expiry | Photo of a box. Multiple angles of the same box = one record |
| Device screen | BP monitor reading | Single data point, needs timestamp from context not OCR |
| Invoice | Path lab bill | Reveals **tests that were ordered but whose results never arrived** |
| Admin form | Birth certificate application | Non-clinical but same thread |

**The invoice insight is the one most systems miss.** A bill listing three tests when only two results exist is how you detect a missing result. That caught a pending newborn screening panel.

---

## 3. Timeline engine

Every record anchors to a date and to a **subject-relative clock**.

- Pregnancy: gestational age recalculated on every turn, from LMP *and* from each scan's assigned dating. When the two diverged (31w by LMP vs 34w by scan), **scan dating wins** and the discrepancy is surfaced, not silently resolved.
- Neonate: age in **days**, not weeks. Day 3 vs Day 6 changed the clinical meaning of an identical bilirubin number.

```
resolve_clock(subject, date) → {
  absolute_age,
  relative_clock,        // gestational_age | day_of_life | post_op_day
  applicable_thresholds  // see §4
}
```

---

## 4. Thresholds are a function of the clock, not constants

This is the single highest-value piece of logic.

Bilirubin 11.0 mg/dL:
- Day 3, full term → safe limit 12.0 → **under**
- Day 6, full term → safe limit 10.0 → **over**

Same number. Opposite action. A naive reference-range check gets this wrong and an app that gets this wrong is dangerous.

**Build:** threshold tables keyed on `(analyte, relative_clock, subject_modifiers[])` where modifiers include term/preterm, trimester, post-op day. Never store a flat normal range.

---

## 5. Trend over snapshot

No single reading was interpreted alone.

```
BP: 132/84 → 131/80 → 113/63 → 103/67 → 99/64 → 132/88
```

The 99/64 was only meaningful as a **33-point drop** from baseline, and it triggered a different question (is she on an antihypertensive? is she dehydrated?) than the number alone would.

Same for weight: 3.5kg → 3.3kg at Day 6 was read against "most babies turn around by Day 4-5," not against a normal-range table.

**Build:** every numeric store needs `previous`, `delta`, `direction`, `rate`. Surface the delta in the reasoning, not just the value.

---

## 6. Medication ledger with active-ingredient dedup

Running state, not a list of prescriptions.

```
Medication {
  brand, active_ingredient, strength, class,
  regulatory_class: drug | nutraceutical | cosmetic | device,
  prescribed_by, start, end, status,
  expiry, batch
}
```

Three independent checks that fired in real use:

1. **Active-ingredient stacking.** Three separate products each carrying vitamin D → combined dose above the 0-6mo upper limit. Nobody prescribing them saw the others.
2. **Regulatory class.** Drug licence vs FSSAI food licence vs cosmetic licence materially changes how much the label can be trusted. Surface it. Two "paediatric" products in the same prescription were food supplements with label arithmetic that didn't balance.
3. **Age appropriateness + route.** A mild steroid is fine on a toddler's arm and questionable on a 12-day-old's broken skin under an occlusive nappy. Route and skin integrity change the risk, not just the molecule.

**Build:** dedup on active ingredient across all active meds. Flag cumulative dose. Store regulatory class at ingestion.

---

## 7. Open-loop tracker

Things ordered that haven't closed.

```
OpenLoop {
  type: test_ordered | followup_due | result_pending | vaccine_due
  opened_on, due_by, source_record, status
}
```

Real examples from the thread: GTT overdue by 2 weeks, newborn screening panel pending for 6 days, growth scan booked 12 Aug, wound dressing 18 Sept, maternity leave start date calculated backward from EDD.

Surface these **contextually**, not as a nagging list. The pending screening panel became relevant the moment a product containing aspartame was prescribed, because PKU was on that panel.

---

## 8. Escalation ladder

Every symptom input resolved to exactly one tier:

| Tier | Trigger | Output shape |
|---|---|---|
| **Reassure** | Fits expected pattern for clock position | Explain the mechanism, give home management |
| **Monitor** | Plausible but unconfirmed | Name the specific signs that would change the tier |
| **Contact today** | Needs clinician input, not urgent | Script the exact call: what to say, which numbers to give |
| **Go now** | Red flag list | Named facility, phone number, no hedging |

Two design rules that mattered:

- **Hard-stop on specific symptom clusters.** Pelvic pain + low-down fetal movement at 26 weeks got a tier-4 response with no analysis, because that combination needs a cervical exam and no amount of text reasoning substitutes.
- **Scripted handoff.** "Call the doctor" is useless. "Tell him: Day 3 bilirubin was 11.0, weight down 3.5 to 3.3, yellow sclera, do you want a repeat?" is actionable. Generate the script from stored values.

---

## 9. Self-correction on new input

A stated fact was misread (weight gain vs loss). The correction arrived three turns later. The system had to **revise its prior conclusion and say so**, not quietly move on.

```
on_correction(fact):
  identify conclusions dependent on the old value
  recompute
  state what changed and why
```

This is a trust mechanic. An app that silently updates loses the user.

---

## 10. Non-clinical adjacency

Same thread handled: birth certificate form field-by-field, maternity pay start date (EDD minus 11 weeks), airline gestational-age cutoffs for travel, travel insurance, hospital bag timing.

All of it derived from the **same clock and the same subject graph**. Don't architect health and admin separately.

---

## Minimum viable loop

```
photo/text in
  → classify document type
  → extract (flag low confidence, never guess)
  → resolve subject + clock
  → write to timeline
  → recompute: deltas, thresholds, med stack, open loops
  → tier the response
  → if tier ≥ 3, generate clinician script
```

---

## What to build first

1. **Timeline + clock resolution.** Everything else depends on it.
2. **Threshold tables keyed on clock.** The differentiator. Generic AI gets this wrong.
3. **Medication ledger with ingredient dedup.** Immediate, demonstrable value.
4. **Document ingestion.** Printed labs first, handwriting later, invoices earlier than you'd think.
5. **Escalation tiering with hard-stops.** Ship nothing without this.

Open loops and self-correction come after the core is stable.

---

## Non-negotiable constraints

- Partial extraction beats confident wrong extraction. Flag the unreadable field, don't infer it.
- Hard-stops override the model. Certain inputs bypass reasoning and route straight to escalation.
- Never resolve a contradiction silently. Surface both values and state which takes precedence.
- The clinician script is the product, not the diagnosis. The output is a better conversation with a doctor.
