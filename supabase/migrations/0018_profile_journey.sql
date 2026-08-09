-- The journey the reader picked, kept.
--
-- THE GAP: `/welcome` asks which season of life someone is in — expecting,
-- trying to conceive, caring for a parent, a new parent, optimising — and then
-- throws the answer away. It lived in component state and died on the next
-- navigation. Nothing downstream has ever been able to read it.
--
-- A DELIBERATE CHANGE OF DECISION. PLAN.md's Phase 1 said journey selection
-- "persists locally, not to a cookie", which was right when it only steered the
-- rest of onboarding. It is not enough for the knowledge feed, which has to
-- know months later and across a reinstall which articles are worth showing.
--
-- ┌─ WHAT THIS IS, AND WHAT IT IS NOT ───────────────────────────────────────┐
-- │                                                                          │
-- │ A PERSONALISATION HINT. It decides which articles surface first, and     │
-- │ nothing else.                                                            │
-- │                                                                          │
-- │ NOT A CLINICAL FACT. "expecting" here means somebody tapped a tile on an │
-- │ onboarding screen, possibly months ago, possibly for a family member,    │
-- │ possibly by accident. It must never be read as a diagnosis, never enter  │
-- │ a medical summary, never be fed to the model as history, and never       │
-- │ appear in an export as though it were something a clinician recorded.    │
-- │ Anything that needs the truth reads `profiles.conditions`, which the     │
-- │ reader typed themselves into their health profile.                       │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘

alter table profiles
  add column journey text check (
    journey in ('expecting', 'fertility', 'caregiver', 'new_parent', 'optimiser', 'other')
  );

comment on column profiles.journey is 'Onboarding personalisation hint, not a clinical fact. Steers which articles surface. Never a diagnosis, never fed to the model, never exported as clinical history.';
