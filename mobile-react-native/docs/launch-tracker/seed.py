"""Seed data for the Cheeku launch tracker, from the code audit of db8cb79.

Writes one JSON file per document under ./seed/<collection>/<id>.json.
"""
import json, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed")
AUDIT = "2026-10-19T09:00:00Z"

# id, owner, area, priority, milestone, effort, kind, title, detail, evidence, decision, dependsOn, status
T = []
def t(id, owner, area, p, m, e, kind, title, detail, evidence="", decision=None, deps=(), status="todo"):
    T.append(dict(id=id, owner=owner, area=area, priority=p, milestone=m, effort=e, kind=kind, title=title,
                  detail=detail, evidence=evidence, decision=decision, dependsOn=list(deps), status=status))

A, S = "athar", "suraj"

# ------------------------------------------------------------------ ops
t("ops-migrations", A, "ops", "P0", "M1", "S", "Ops", "Apply migrations 0031 to 0034 to production",
  "Consent, carried-over sign-ups, Home stages and daily logs are built but inert until applied. Run npm run db:migrate, or the SQL editor steps in order, then confirm with the applied-migrations check.",
  "supabase/migrations/0031..0034, supabase/manual/0031-step-*..0034-step-*, supabase/manual/0000-check-what-is-applied.sql")
t("ops-push-webhook", A, "ops", "P0", "M1", "S", "Ops", "Wire the push sender so phones actually buzz",
  "push-dispatch is deployed code only. Add the Database Webhook on notifications INSERT, set PUSH_WEBHOOK_SECRET, deploy with --no-verify-jwt. Until then no server-side notification reaches a phone.",
  "supabase/functions/push-dispatch/index.ts (header)")
t("ops-auth-config", A, "ops", "P0", "M1", "S", "Ops", "Put Supabase auth settings under version control",
  "There is no supabase/config.toml, so email confirmation, OTP and sign-in rate limits, leaked-password checks, session length and redirect URLs live only in the dashboard. Capture them in config and review each.",
  "supabase/ (no config.toml)")
t("ops-envs", A, "ops", "P1", "M1", "M", "Ops", "Separate staging and production",
  "One Supabase project per environment, EAS build profiles per environment, secrets in EAS and Supabase only. Migrations land in staging first.",
  "mobile-react-native/eas.json, .env.example")
t("ops-ci", A, "ops", "P1", "M1", "M", "Ops", "CI on every pull request",
  "No .github/workflows today. Run tsc, eslint, vitest (400 tests) and a migration dry run on a throwaway Postgres using the local-check scenario files.",
  "supabase/manual/local-check/*.sql")
t("ops-monitoring", A, "ops", "P0", "M2", "M", "Ops", "Crash and error reporting with health data scrubbed",
  "No crash reporter or log alerting exists. Add Sentry (or similar) with PII and health-data scrubbing, plus alerts on Edge Function errors and slow RPCs.",
  "mobile-react-native/package.json (no crash reporter)")
t("ops-backups", A, "ops", "P0", "M2", "S", "Ops", "Backups, point-in-time recovery and a restore drill",
  "Turn on PITR, back up the documents bucket, and run one restore into staging so we know it works before real families depend on it.")
t("ops-rename", A, "ops", "P0", "M2", "S", "Ops", "Rename bundle ids from baymax before store listings",
  "Bundle id and package are com.baymax.app and the slug is baymax. Baymax is a Disney character and blocks store submission. Change before creating store accounts.",
  "mobile-react-native/app.json")

# ------------------------------------------------------------- security
t("sec-delete-auth", A, "security", "P0", "M1", "M", "Security", "Account deletion must remove the sign-in itself",
  "Delete account removes records, files and photos but leaves the auth user, so the email can still sign in. Add a service-role Edge Function that deletes auth.users after the data, and log it. DPDP erasure needs this.",
  "mobile-react-native/src/lib/account/actions.ts (deleteAccountData)")
t("sec-demo-billing", A, "security", "P0", "M2", "S", "Security", "Remove the free demo upgrade before launch",
  "activate_tier_demo is granted to every signed-in user and hands out paid tiers while app_flags.demo_billing is on. Drop the function and the flag in the release that ships real billing.",
  "supabase/migrations/0012 (grant execute to authenticated), src/lib/billing/subscribe.ts", deps=["pay-subscriptions"])
t("sec-lab-demo", A, "security", "P0", "M2", "S", "Security", "Stop lab bookings moving on the clock",
  "sync_lab_bookings advances status by time and advance_lab_booking_demo is callable from the app. Once partner webhooks exist, only signed partner events may change a booking.",
  "supabase/migrations/0027_labs_and_reviews.sql (sync_lab_bookings, advance_lab_booking_demo)", deps=["int-lab-partner"])
t("sec-listings", A, "security", "P0", "M2", "S", "Security", "Replace real lab brands that carry made-up prices",
  "lab_partners seeds Dr Lal PathLabs, Thyrocare, Metropolis, Redcliffe and Healthians with invented fees, report times and price factors. Showing real brands without an agreement is a legal and trust risk. Use the contracted partner's catalogue or neutral names.",
  "supabase/migrations/0027_labs_and_reviews.sql lines 445-450")
t("sec-sample-data", A, "security", "P0", "M2", "S", "Security", "Keep sample doctors and sample reviews out of production",
  "Doctors are hard-coded samples and provider_reviews is seeded with is_sample rows. Gate both behind a demo flag that is off in production, and add one-review-per-booking and a report button.",
  "src/lib/booking/catalog.ts, supabase/migrations/0027 (provider_reviews seed)")
t("sec-definer-review", A, "security", "P0", "M2", "M", "Security", "Review all 42 SECURITY DEFINER functions",
  "Each must pin search_path, check auth.uid() against the row, bound its inputs, and revoke execute from anon and public unless meant to be public. RLS is on for all 32 tables, so these functions are the remaining way around it.",
  "supabase/migrations/*.sql (42 security definer)")
t("sec-offline-cache", A, "security", "P1", "M2", "M", "Security", "Encrypt the offline copy of records",
  "The offline cache is plain AsyncStorage inside the app container. Encrypt it with a key kept in SecureStore, and keep the switch to turn it off on shared family phones.",
  "src/lib/offline/cache.ts")
t("sec-dpdp", A, "security", "P0", "M2", "M", "Privacy", "DPDP readiness: owner, requests, legal text, breach plan",
  "Name the grievance officer, give privacy_requests a handler (admin view or email workflow), fill the [placeholders] in the legal entity file, get a lawyer to read all four texts, and write a breach notification runbook.",
  "src/lib/legal/entity.ts, privacy_requests (0031)")
t("sec-payments-pci", A, "security", "P0", "M3", "M", "Security", "Payments without touching card data",
  "Hosted checkout only (Razorpay or Cashfree), orders created server-side, payment signature verified in a webhook, store payment ids only. No card or UPI details ever reach our database or logs.",
  deps=["pay-care"])
t("sec-signed-urls", A, "security", "P2", "M3", "S", "Security", "Tighten signed URL lifetimes and caching",
  "Record files use 60-second links, daily photos and avatars one hour. Make sure links never land in the persisted offline cache and shorten photo links where the screen allows.",
  "src/lib/home/logs.ts (usePhotoUrl), src/lib/records/queries.ts")
t("sec-pentest", A, "security", "P1", "M3", "L", "Security", "External penetration test before public launch",
  "A third-party VAPT on the app, Supabase policies, storage and Edge Functions. Health apps get scrutinised in store review and by partners.")

# ------------------------------------------------------------ rate limits
t("rl-chat-edge", A, "ratelimit", "P0", "M1", "M", "Rate limit", "Rate-limit and meter the chat model call on the server",
  "cheeku-chat only relies on the sign-in check. The daily chat quota is enforced when a message row is saved, not when the model is called, so one account can call the model in a loop. Check quota and a per-minute limit inside the function before forwarding.",
  "supabase/functions/cheeku-chat/index.ts, supabase/migrations/0022_daily_free_chats.sql")
t("rl-free-20", A, "ratelimit", "P0", "M1", "S", "Product", "Raise free chats from 5 to 20 a day",
  "FREE_CHAT_LIMIT is 5 in the app and 5 inside enforce_chat_quota. Change both in one migration and one release, and show a soft line after 15.",
  "src/lib/billing/plans.ts:51, supabase/migrations/0022_daily_free_chats.sql")
t("rl-uploads", A, "ratelimit", "P1", "M2", "S", "Rate limit", "Daily upload caps and storage quota per plan",
  "The bucket is private, 10 MB, jpeg/png/heic/pdf only. Add a per-account daily upload cap across documents and daily photos, and a storage quota per plan. Daily logs already cap at 80 a day per member.",
  "supabase/migrations/0005_storage.sql, 0034_daily_logs.sql")
t("rl-auth", A, "ratelimit", "P1", "M2", "S", "Rate limit", "Sign-up and sign-in abuse protection",
  "Set Supabase auth rate limits deliberately and add a captcha (Turnstile or hCaptcha) on sign-up and password reset.", deps=["ops-auth-config"])
t("rl-rpc", A, "ratelimit", "P1", "M2", "M", "Rate limit", "Throttle the heavy read RPCs",
  "memory_bundle returns up to 3,000 entities and 2,000 facts per call and health_file_bundle is similar, with no per-user limit. Add a light request ledger or gateway limit.",
  "supabase/migrations/0030_memory_layer.sql (limit 3000, limit 2000)")

# --------------------------------------------------------------- payments
t("pay-subscriptions", A, "payments", "P0", "M2", "L", "Integration", "Real subscriptions through App Store and Play billing",
  "The paywall calls activate_tier_demo. Digital subscriptions must use store billing (or RevenueCat over it), with server-side receipt validation writing the subscriptions table and handling renewals, refunds and grace periods.",
  "src/lib/billing/subscribe.ts, src/components/billing/paywall.tsx")
t("pay-care", A, "payments", "P0", "M3", "L", "Integration", "Payments for lab tests and consults",
  "Physical care can be paid outside store billing. Razorpay or Cashfree, refunds and cancellation rules, GST invoices filed into the member's records.",
  decision="Who is merchant of record for care bookings (decides GST and invoices)")
t("pay-markup", A, "payments", "P1", "M3", "M", "Integration", "Markup rules and a price breakdown",
  "markup_rules in config by service and tier, applied server-side to the partner price, with the breakdown one tap away in the booking card.",
  decision="Starting markup band per service", deps=["int-lab-partner"])

# ------------------------------------------------------------ integrations
t("int-lab-partner", A, "integrations", "P0", "M3", "L", "Integration", "Lab partner integration end to end",
  "Adapter for catalogue, serviceable pincodes, slots, order, signed status and result webhooks, and the result PDF filed into documents so the reader picks it up.",
  "src/lib/labs/*, supabase/migrations/0027", decision="Final lab partner contract and API access")
t("int-doctors", A, "integrations", "P0", "M3", "L", "Integration", "Real doctor consults and video",
  "The doctor list, slots and fees are hard-coded samples and the video room is a placeholder. Integrate a teleconsult partner for listings, booking, payment and the call.",
  "src/lib/booking/catalog.ts, src/lib/booking/appointments.ts", decision="Teleconsult partner")
t("int-server-bookings", A, "integrations", "P0", "M2", "M", "Backend", "Move appointments and service requests to the server",
  "Both live only in on-phone storage (cheeku.appointments, cheeku.serviceRequests). A reinstall or second phone loses them and caregivers can't see them. Server tables with RLS, the phone becomes a cache.",
  "src/lib/booking/appointments.ts, src/lib/services/requests.ts")
t("int-services", A, "integrations", "P1", "M3", "L", "Integration", "Services marketplace provider",
  "Dental, eye, physio, home care, transport and medicines go through a preview provider that answers instantly and books nothing. Implement MarketplaceProvider for the real partner.",
  "src/lib/services/provider.ts")
t("int-share-target", A, "integrations", "P0", "M2", "M", "App", "WhatsApp and Files share-sheet target into Scan",
  "Most Indian reports arrive as WhatsApp PDFs. Register the app as a share target so a forwarded report lands in Scan, asking whose it is.")
t("int-wearables", A, "integrations", "P1", "M3", "L", "Integration", "Apple Health and Health Connect",
  "Steps, sleep, BP and weight straight into daily logs and memory, replacing screenshots as proof. Needs a native build.",
  "src/lib/home/logs.ts")
t("int-messaging", A, "integrations", "P2", "M3", "M", "Integration", "WhatsApp and SMS for confirmations and caregiver alerts",
  "Booking confirmations and caregiver alerts through a WhatsApp Business provider, with templates approved in advance.")

# -------------------------------------------------------------- daily loop
t("loop-meds", A, "loop", "P0", "M2", "L", "App", "Your medicines: doses, Taken, refills",
  "The ledger already knows each medicine's schedule. Add the per-medicine list with a Taken button, a dose log table, refill date from pack size, and on-phone dose reminders. Feeds caregiver alerts.",
  "src/lib/memory/ledger.ts, app/memory.tsx")
t("loop-notifs", A, "loop", "P0", "M2", "M", "Backend", "Six new notification kinds",
  "daily_nudge, dose_due, refill_due, retest_due, parent_alert, sunday_review: add to the kinds, the RLS allow-list, routing and settings. At most one nudge a day.",
  "src/lib/notifications/types.ts, supabase/migrations/0024_notifications.sql", decision="Default nudge time and whether people can change it")
t("loop-cron", A, "loop", "P0", "M2", "M", "Backend", "Scheduled jobs for the daily loop",
  "There are no scheduled jobs at all. pg_cron (or scheduled Edge Functions) for the morning nudge, retest reminders, parent alerts, lab status and retention cleanup, each respecting the family's Home stage.",
  deps=["ops-push-webhook", "loop-notifs"])
t("loop-caregiver", A, "loop", "P0", "M3", "L", "App", "Caregiver view and parent alerts",
  "Parent card with doses this week, latest readings and anything overdue; caregiver roles and alert preferences on profile relations; a gentler view when the parent has their own login.",
  decision="How consent works when a parent has their own login", deps=["loop-meds"])
t("loop-scan-ux", A, "loop", "P0", "M2", "M", "App", "Scan: Report or Prescription, whose is it, confirm step",
  "Two clear choices, the member picker, and a confirm screen that highlights only low-confidence values from the reader.",
  "app/scan.tsx", deps=["ai-ocr-report"])
t("loop-reading-v2", A, "loop", "P0", "M3", "L", "App", "Report reading v2 and prescription scorecard screens",
  "Reports: where you stand, what changed since last time, what to do next, grouped by body system. Prescriptions: the 8 of 10 checks scorecard with the exact question for the doctor.",
  "app/records/[id].tsx", deps=["ai-rx-score"])
t("loop-chat-chips", A, "loop", "P1", "M3", "M", "App", "Chat: context chips and one next-step chip",
  "Show what Cheeku used from memory above an answer, and one action under it (remind, log, book, ask a doctor).",
  "src/components/chat/turn.tsx", deps=["ai-memory-tools"])
t("loop-onboarding", A, "loop", "P1", "M3", "M", "App", "Onboarding goals and permission asks",
  "Who are you looking after, what do you want more of, add a report; then notifications and health data permissions. Land on a filled Today in under two minutes.",
  "app/welcome.tsx, app/who.tsx, app/journey.tsx")

# ----------------------------------------------------------- performance
t("perf-home-rpc", A, "perf", "P1", "M2", "M", "Performance", "One call for Home on Today",
  "Opening Home on Today fires about ten requests: home_state, today_actions, daily_logs, daily_prefs, memory_bundle, records, knowledge feed, health file, family and consent. Fold the Today ones into one RPC.",
  "app/(app)/home.tsx, src/lib/home/use-plan.ts")
t("perf-bundle", A, "perf", "P1", "M2", "M", "Performance", "Stop shipping the whole memory to the phone",
  "memory_bundle can return 3,000 entities and 2,000 facts on every chat turn. Send a windowed bundle (latest per marker plus 18 months) and page the rest. Pairs with server-side memory.",
  "supabase/migrations/0030_memory_layer.sql, src/lib/memory/store.ts", deps=["ai-memory-server"])
t("perf-indexes", A, "perf", "P1", "M2", "S", "Performance", "Index review on production-sized data",
  "EXPLAIN the hot paths with realistic volumes: documents by member and date, entities by member and analyte, messages by thread and time, memory_facts by member and key.")
t("perf-images", A, "perf", "P2", "M3", "S", "Performance", "Light previews for report images",
  "Report photos upload at up to 3,000 px. Keep the original for the reader and serve a 1,600 px preview for viewing.",
  "src/lib/upload/strip-exif.ts")
t("perf-loadtest", A, "perf", "P1", "M3", "M", "Performance", "Load test with 10,000 simulated families",
  "k6 against staging: RPC p95, chat path, uploads, realtime inbox. Size Supabase compute from the results.")

# ------------------------------------------------------------------ cost
t("cost-supabase", A, "cost", "P2", "M3", "S", "Cost", "Supabase plan sizing and storage hygiene",
  "Pro plan plus the compute add-on the load test calls for; delete orphaned storage objects; cache signed URLs to cut egress.", deps=["perf-loadtest"])
t("cost-routing", A, "cost", "P1", "M2", "S", "Cost", "Send free-tier chats to the cheaper path",
  "Pass the tier and intent to cheeku-chat so free and simple questions go to the small model and a smaller context, with Suraj's routing.", deps=["ai-routing"])

# ---------------------------------------------------------------- quality
t("qa-device", A, "quality", "P0", "M3", "M", "QA", "On-device QA on iPhone and a low-end Android",
  "Every flow on real phones. The web preview has shown layouts that broke on iOS before, so nothing counts as verified until it runs on a device.")
t("qa-e2e", A, "quality", "P1", "M3", "M", "QA", "End-to-end tests for the main journey",
  "Maestro flows for sign-up, first upload, Today, chat and a booking, run before each release.")
t("qa-store", A, "quality", "P0", "M3", "M", "Launch", "Store readiness",
  "Privacy labels, health data declarations, in-app account deletion, medical disclaimer, screenshots, review notes and a demo account for reviewers.", deps=["ops-rename"])
t("qa-analytics", A, "quality", "P1", "M3", "M", "Launch", "Privacy-safe product analytics",
  "Events with no health data: activation, D1 and D7 retention, Today completion, notification mute rate, booking conversion.")

# --------------------------------------------------------------- clinical
t("content-clinical", A, "clinical", "P0", "M3", "M", "Content", "Clinician sign-off on daily plan content and articles",
  "The 40-plus habits, meal tips and nine Learn articles need a clinician's read before public launch.",
  "src/lib/home/content.ts, src/lib/home/catalog.ts, src/lib/home/meals.ts, migrations 0017 and 0021")

# =================================================================== SURAJ
t("ai-ocr-report", S, "ai-ocr", "P0", "M2", "L", "AI", "Report reader: fine-tuned OCR and extraction",
  "Indian lab PDFs and photos into markers, values, units, reference ranges and flags, with a confidence score per value. Replaces the mock reader that guesses from the file name. Output must match the existing extraction contract.",
  "src/lib/ai/mock/extract.ts, REACT_NATIVE_BUILD.md")
t("ai-ocr-rx", S, "ai-ocr", "P0", "M2", "L", "AI", "Prescription reader, handwriting included",
  "Drug, strength, dose, frequency, duration and doctor from printed and handwritten prescriptions, with confidence per line.")
t("ai-brand-salt", S, "ai-ocr", "P0", "M2", "M", "AI", "Brand to salt resolver",
  "Dolo 650 to paracetamol 650 mg and the like, from a licensed Indian drug database. Feeds the medicine ledger and the prescription checks.",
  decision="Which drug data provider to license")
t("ai-ocr-pipeline", S, "ai-ocr", "P0", "M2", "M", "AI", "Asynchronous extraction pipeline",
  "Upload, queue, reader, entities and document status (needs review or filed), then a notification. Retries, idempotency, and logs that never contain health data.",
  "src/lib/records/upload.ts", deps=["ai-ocr-report"])
t("ai-ocr-eval", S, "ai-ocr", "P0", "M2", "M", "Eval", "Reader evaluation set and review queue",
  "500 de-identified reports from the ten most common Indian labs and 200 prescriptions. Field-level accuracy and unit normalisation targets; anything below the confidence bar goes to a human review queue.")

t("ai-memory-server", S, "ai-memory", "P0", "M2", "L", "AI", "Build the memory context on the server",
  "Today the phone builds the memory and sends it to cheeku-chat, which trusts it. Build the longitudinal context server-side (latest per marker, trends, medicines, open loops, pregnancy clock) so it can't be tampered with and doesn't ship the whole history every turn.",
  "supabase/functions/cheeku-chat/index.ts (body.memory), src/lib/memory/context.ts")
t("ai-memory-tools", S, "ai-memory", "P1", "M3", "M", "AI", "Memory as tools, with citations per claim",
  "get_labs, get_meds, get_due, get_goals as model tools; every number in an answer cites the fact it came from.", deps=["ai-memory-server"])
t("ai-memory-normalise", S, "ai-memory", "P1", "M2", "M", "AI", "Normalise and de-duplicate entities across reports",
  "One analyte key per marker across labs, unit conversion, lab-specific reference ranges, and a corrections loop when a person fixes a value.",
  "src/lib/memory/thresholds.ts (analyteKey), src/lib/memory/series.ts")

t("ai-model-ft", S, "ai-model", "P0", "M2", "L", "AI", "Fine-tune the 15 to 22B India health model",
  "Trained on Indian lab reports, drug brands, diets and Hinglish, for longevity coaching. Deliver an endpoint that speaks the existing ModelRequest and ModelReply contract so turning it on is a secrets change.",
  "src/lib/memory/model.ts, supabase/functions/cheeku-chat/index.ts")
t("ai-serving", S, "ai-model", "P0", "M2", "L", "Infra", "Inference serving in India",
  "vLLM or TGI on India-region GPUs, 4-bit or 8-bit quantisation, autoscaling to zero off-peak, private networking to the Edge Function, data kept in India, and a p95 latency target.",
  deps=["ai-model-ft"])
t("ai-routing", S, "ai-model", "P1", "M3", "M", "AI", "Model routing and token budgets",
  "Small model for free tier and simple intents, full model for complex ones; prompt caching and a token budget per tier.", deps=["ai-serving"])
t("ai-rx-score", S, "ai-model", "P0", "M3", "L", "AI", "Prescription scorecard engine",
  "Checks 1, 2, 4, 5 and 6: composition, banned fixed-dose combinations, interactions, dose fit for age and kidney function, duplication. Every flag carries its source.",
  deps=["ai-brand-salt"])
t("ai-meal-vision", S, "ai-model", "P2", "M3", "M", "AI", "Read meal photos",
  "Fill daily_logs.analysis from the plate photo on the server. The app can't write that field, so this stays server-side.",
  "supabase/migrations/0034_daily_logs.sql")

t("ai-guardrails", S, "ai-safety", "P0", "M2", "M", "Safety", "Output guard on every answer",
  "Block any number not present in memory, keep the urgency tier at or above the floor, never tell anyone to stop a medicine, route red flags straight to care.",
  "src/lib/memory/ladder.ts, supabase/functions/cheeku-chat/index.ts (tier floor)")
t("ai-evals", S, "ai-safety", "P0", "M2", "M", "Eval", "Clinical eval harness and release gate",
  "The 50 everyday questions across personas, plus red-teaming for self-harm, pregnancy, children and drug interactions. No model version ships without passing.")
t("ai-injection", S, "ai-safety", "P0", "M2", "S", "Safety", "Prompt-injection defence",
  "Report text and people's notes are data, never instructions. Strip instructions from OCR text and keep the tool allow-list tight.")
t("ai-data-governance", S, "ai-safety", "P0", "M2", "M", "Privacy", "Training data governance",
  "Only data under the product-improvement consent goes into training, de-identified first. No health data in logs. Publish a model card.",
  "consent purposes (0031)")
t("ai-clinical-signoff", S, "ai-safety", "P0", "M2", "M", "Clinical", "Clinical sign-off on thresholds, hard stops and symptoms",
  "The clock-keyed limits, the hard-stop ladder and the symptom models need a clinician's review. The newborn bilirubin rows are examples, not a guideline.",
  "src/lib/memory/thresholds.ts, src/lib/memory/ladder.ts, src/lib/memory/symptoms.ts")
t("ai-cost-model", S, "cost", "P1", "M2", "S", "Cost", "Cost per chat and per page read",
  "Measure GPU cost per chat turn and per OCR page, set a target cost per active family per month, and put it on a dashboard.", deps=["ai-serving"])

# ================================================================ SHIPPED
def shipped(id, owner, title, detail, evidence):
    t(id, owner, "shipped", "P0", "M1", None, "Shipped", title, detail, evidence, status="done")
shipped("done-rls", A, "Row-level security on all 32 tables", "Every table enables RLS; storage is private with a 10 MB and file-type limit.", "supabase/migrations/*.sql, 0005_storage.sql")
shipped("done-consent", A, "Consent ledger, re-consent gate and privacy settings", "Versioned policies, a write guard that refuses health data without consent, privacy requests, storage notice.", "migrations 0031, 0032")
shipped("done-family", A, "Family members, plans and switching", "Members, seats by plan, removal, photos, and every screen following the active member.", "migrations 0025, 0026")
shipped("done-memory", A, "On-device memory layer and safety router", "Readings, trends, medicine ledger, open loops, pregnancy clock and hard stops, with 400 passing tests.", "src/lib/memory/*, migration 0030")
shipped("done-records", A, "Records: 11 types, detail pages, move and delete", "Per-type detail pages, invoices, medicine sync, EXIF stripped from photos.", "migration 0028, app/records")
shipped("done-today", A, "Home stages and Today", "Starter, building and Today, unlocked by one record, with streaks and family alerts.", "migration 0033, src/lib/home")
shipped("done-plan", A, "Today's action plan across five pillars", "Personalised plan, steps with proof, meal photos and plate read, readings into memory, breathing.", "migration 0034, app/today.tsx")
shipped("done-inbox", A, "Notification inbox and on-phone reminders", "Inbox with realtime, categories and settings; local reminders for appointments, labs and records.", "migration 0024, src/lib/notifications")
shipped("done-chat-relay", A, "Chat relay ready for Suraj's model", "cheeku-chat forwards the request, enforces the urgency floor and falls back to the stand-in until the model URL is set.", "supabase/functions/cheeku-chat")

# ================================================================ MODULES
M = []
def m(id, layer, name, state, note, order):
    M.append(dict(id=id, layer=layer, name=name, state=state, note=note, order=order))
m("m-auth", "App", "Sign-up and sign-in", "live", "Email and password; auth settings not in config yet", 1)
m("m-consent", "App", "Consent and privacy", "live", "Needs migrations 0031 and 0032 applied", 2)
m("m-family", "App", "Family, plans, switching", "live", "Seats by plan; caregiver roles not built", 3)
m("m-home", "App", "Home stages and Today", "live", "Needs migration 0033", 4)
m("m-plan", "App", "Today's action plan", "live", "Needs migration 0034; steps typed with screenshot", 5)
m("m-records", "App", "Records and detail pages", "live", "Reading v2 and Rx scorecard not built", 6)
m("m-scan", "App", "Scan and upload", "partial", "Upload is real; reading is a mock", 7)
m("m-chat", "App", "Chat thread and memory screen", "partial", "Answers come from the stand-in model", 8)
m("m-meds", "App", "Your medicines", "partial", "Ledger only; no doses, Taken or refills", 9)
m("m-caregiver", "App", "Caregiver view", "partial", "Family alert for overdue tests only", 10)
m("m-learn", "App", "Learn library and health file", "live", "Articles await clinical review", 11)
m("m-billing", "App", "Subscriptions", "dummy", "Demo upgrade grants tiers free", 12)
m("b-rls", "Backend", "Row-level security", "live", "All 32 tables; 42 definer functions to review", 1)
m("b-storage", "Backend", "Private document storage", "live", "10 MB, jpeg/png/heic/pdf; no per-user quota", 2)
m("b-chatfn", "Backend", "cheeku-chat function", "partial", "No server-side quota or rate limit", 3)
m("b-push", "Backend", "push-dispatch function", "partial", "Webhook and secret not configured", 4)
m("b-cron", "Backend", "Scheduled jobs", "missing", "No nudges, retests or parent alerts", 5)
m("b-delete", "Backend", "Account deletion", "partial", "Sign-in survives deletion", 6)
m("b-bookings", "Backend", "Appointments and service requests", "partial", "Stored on the phone only", 7)
m("b-ops", "Backend", "Monitoring, CI, backups", "missing", "No crash reporting, CI or restore drill", 8)
m("ai-reader", "AI", "Report reader", "dummy", "Mock that reads the file name", 1)
m("ai-rx", "AI", "Prescription reader", "missing", "Includes handwriting and brand to salt", 2)
m("ai-memory", "AI", "Longitudinal memory", "partial", "Rule-based on the phone; server side next", 3)
m("ai-model", "AI", "Longevity chat model (15 to 22B)", "dummy", "Stand-in answers until the endpoint is set", 4)
m("ai-safety", "AI", "Safety router and hard stops", "live", "Needs clinical sign-off", 5)
m("ai-score", "AI", "Prescription scorecard", "missing", "Checks 1, 2, 4, 5, 6 first", 6)
m("i-labs", "Integrations", "Lab partner", "dummy", "Simulated partner; real brand names seeded", 1)
m("i-doctors", "Integrations", "Doctor consults", "dummy", "Sample doctors, placeholder video", 2)
m("i-services", "Integrations", "Services marketplace", "dummy", "Preview provider books nothing", 3)
m("i-pay", "Integrations", "Payments for care", "missing", "Merchant of record undecided", 4)
m("i-wear", "Integrations", "Apple Health, Health Connect", "missing", "Needs a native build", 5)
m("i-share", "Integrations", "WhatsApp share target", "missing", "Reports arrive as WhatsApp PDFs", 6)

def write():
    for coll, rows in (("tasks", T), ("modules", M)):
        os.makedirs(os.path.join(OUT, coll), exist_ok=True)
        for i, r in enumerate(rows):
            r = dict(r)
            if coll == "tasks":
                r["order"] = i
                r["updatedAt"] = AUDIT
                r["completedAt"] = AUDIT if r["status"] == "done" else None
            with open(os.path.join(OUT, coll, r["id"] + ".json"), "w") as f:
                json.dump({k: v for k, v in r.items() if k != "id" or coll == "modules"}, f, ensure_ascii=False)
    os.makedirs(os.path.join(OUT, "meta"), exist_ok=True)
    with open(os.path.join(OUT, "meta", "audit.json"), "w") as f:
        json.dump({"auditedOn": "19 Oct 2026", "commit": "db8cb79", "branch": "claude/exciting-cori-syren6", "tasks": len(T), "modules": len(M)}, f)
    os.makedirs(os.path.join(OUT, "log"), exist_ok=True)
    with open(os.path.join(OUT, "log", "seed.json"), "w") as f:
        json.dump({"at": AUDIT, "taskId": None, "title": "Launch audit", "from": None, "to": "todo", "by": "claude",
                   "note": f"Audit of db8cb79 seeded {len(T)} tasks and {len(M)} platform modules."}, f)
    print(len(T), "tasks;", len([x for x in T if x['owner']=='athar']), "athar;", len([x for x in T if x['owner']=='suraj']), "suraj;", len(M), "modules")
    # sanity: dependsOn ids exist, no em dashes
    ids = {x["id"] for x in T}
    for x in T:
        for d in x["dependsOn"]:
            assert d in ids, (x["id"], d)
        for v in x.values():
            if isinstance(v, str): assert "—" not in v, x["id"]

write()
