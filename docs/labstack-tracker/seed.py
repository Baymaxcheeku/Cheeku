"""Seed for the Cheeku x LabStack partnership tracker.

Endpoint names are deliberately left empty: they are filled only after the
Labs, Consultation and Pharma API docs have been read.
"""
import json, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed")
AT = "2026-10-19T10:00:00Z"
LAUNCH = "https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe"

T = []
def t(id, phase, service, owner, p, title, detail, plugs="", ask="", main=()):
    T.append(dict(id=id, phase=phase, service=service, owner=owner, priority=p, title=title, detail=detail,
                  plugsInto=plugs, partnerAsk=ask, mainTaskIds=list(main), status="todo"))

# ---------------------------------------------------------------- p0 prepare now
t("pre-gateway", "p0", "common", "athar", "P0", "Server-side partner gateway, so the app never calls LabStack directly",
  "One Edge Function (partner-gateway) owns every call to LabStack: keys stay in Supabase secrets, requests are logged without health data, retries and timeouts live in one place. The app keeps talking to our own RPCs and the MarketplaceProvider interface.",
  "src/lib/services/provider.ts (MarketplaceProvider), supabase/functions/", main=["int-lab-partner", "int-services"])
t("pre-orders-table", "p0", "common", "athar", "P0", "One partner_orders table for labs, consults and medicines",
  "Service, partner reference, our reference, member, status, amounts, slot, and the raw partner events, with RLS. Lab bookings, appointments and service requests move onto it, so caregivers and second phones see the same orders.",
  "supabase/migrations (new), lab_bookings (0027), src/lib/booking/appointments.ts, src/lib/services/requests.ts", main=["int-server-bookings"])
t("pre-status-model", "p0", "common", "athar", "P0", "Our canonical order status model",
  "One set of states for every service (requested, confirmed, assigned, in progress, completed, cancelled, failed, refunded) so LabStack's statuses map onto it once the docs are read. The lab states we already show (booked, assigned, collected, processing, ready) stay the user-facing words.",
  "supabase/migrations/0027 (lab_bookings.status), src/lib/services/provider.ts (RequestStatus)")
t("pre-webhook-receiver", "p0", "common", "athar", "P1", "Webhook receiver skeleton with signature check and replay",
  "A partner-webhook Edge Function that verifies a signature, stores the raw event, de-duplicates by event id and applies the mapped status. Built against our own test events now, pointed at LabStack later.",
  "supabase/functions/ (new), apply_lab_status (0027)", main=["sec-lab-demo"])
t("pre-data-minimum", "p0", "common", "athar", "P0", "Decide the minimum data each booking sends",
  "Name, age band or date of birth, phone, address and slot for labs; plus the concern note for consults (only with consent); prescription image for medicines. Never records, lab values or chat unless the person shares them explicitly.",
  "src/lib/services/provider.ts (what never crosses this line), consent purpose care_bookings (0031)")
t("pre-flags", "p0", "common", "athar", "P0", "Keep preview providers behind a switch; remove real brand names",
  "Sample labs, doctors and the preview marketplace stay on in development only. The seeded lab brand names come out before any public build.",
  "supabase/migrations/0027 (lab_partners seed), src/lib/booking/catalog.ts", main=["sec-listings", "sec-sample-data"])
t("pre-results-ingest", "p0", "labs", "suraj", "P0", "Route partner lab results into memory",
  "A result from LabStack becomes a document for the right member. If structured values come with it, they go straight to entities and skip OCR; the PDF still goes through the reader as a check.",
  "src/lib/records/upload.ts, entities (0002), the reader pipeline", main=["ai-ocr-pipeline", "ai-ocr-report"])
t("pre-rx-ingest", "p0", "consult", "suraj", "P1", "Route consult prescriptions into the medicine ledger",
  "An e-prescription from a LabStack consult becomes a prescription record, updates the ledger and runs the scorecard checks.",
  "src/lib/memory/ledger.ts, prescription reader", main=["ai-ocr-rx", "ai-rx-score"])
t("pre-salt-sku", "p0", "pharma", "suraj", "P1", "Brand to salt resolver doubles as the medicine matcher",
  "The same resolver that reads prescriptions maps a ledger medicine to a pharmacy product, so refills reorder the right strength and generics can be offered neutrally.",
  "src/lib/memory/ledger.ts", main=["ai-brand-salt"])
t("pre-what-to-book", "p0", "labs", "suraj", "P1", "Longevity engine decides what to book",
  "Retests due, panels by flagged marker and age-based screening become booking intents with our own test codes, ready to map onto LabStack's catalogue codes.",
  "src/lib/memory/loops.ts, src/lib/memory/intent.ts, Today's plan due items", main=["ai-memory-tools"])
t("pre-questions", "p0", "common", "founder", "P1", "Send Varun the question list before the deep dive",
  "Everything under Questions for LabStack, so the first technical call answers what blocks us instead of exploring.", ask="A technical contact for the integration")

# ---------------------------------------------------------------- p1 access and docs
t("acc-agreement", "p1", "common", "founder", "P0", "Partnership agreement and data processing agreement",
  "Scope (labs, consults, medicines), who is merchant of record, liability, data protection under DPDP (LabStack as a processor for what we send), data residency, breach notice, exit terms.",
  ask="Their standard partner agreement and DPA", main=["sec-dpdp", "pay-care"])
t("acc-commercials", "p1", "common", "founder", "P0", "Commercial terms",
  "Partner prices versus MRP, our markup rules, settlement cycle, refunds and cancellation fees, GST invoicing, minimum volumes if any.",
  ask="Rate card and settlement terms", main=["pay-markup", "pay-care"])
t("acc-sandbox", "p1", "common", "labstack", "P0", "Sandbox access and credentials",
  "Sandbox base URLs, test keys, test pincodes and test patients for all three APIs. Keys go straight into Supabase secrets, never into the app.",
  ask="Sandbox keys and base URLs for Labs, Consultation and Pharma")
t("acc-docs-review", "p1", "common", "athar", "P0", "Read the three API docs and fill the inventory",
  "Map every capability in the API inventory to its LabStack endpoint, mark gaps, and note auth, errors, pagination and rate limits.",
  "This tracker: API inventory")
t("acc-webhooks", "p1", "common", "labstack", "P0", "Agree webhook events, signing and retries",
  "Which events they push (order status, report ready, consult completed, delivery updates), how they sign them, how they retry, and the IP range to allow.",
  ask="Webhook event list and signing method")
t("acc-support", "p1", "common", "founder", "P1", "Escalation contacts and SLAs",
  "Who we call when a collection is missed or a report is late, response times, and a status page if they have one.", ask="Escalation matrix and SLAs")

# ---------------------------------------------------------------- p2 labs
t("lab-catalogue", "p2", "labs", "athar", "P0", "Sync the test catalogue, packages and prices",
  "Scheduled sync into lab_tests and lab_offers, partner price kept beside our price after markup; the booking card shows one price.",
  "lab_tests, lab_offers (0027), src/lib/labs/queries.ts", main=["int-lab-partner", "pay-markup"])
t("lab-serviceability", "p2", "labs", "athar", "P0", "Pincode serviceability and live slots",
  "Check the address pincode before showing a slot; show only slots LabStack can serve.", "app/labs/*, address store (cheeku.labAddress)")
t("lab-order", "p2", "labs", "athar", "P0", "Create orders through the gateway",
  "create_lab_booking calls the gateway with an idempotency key, stores LabStack's order id, and never double-books on a retry.", "create_lab_booking (0027)")
t("lab-status", "p2", "labs", "athar", "P0", "Status from LabStack only",
  "Webhooks drive assigned, collected, processing and ready; the clock-based sync and the demo advance button are removed.",
  "sync_lab_bookings, advance_lab_booking_demo (0027)", main=["sec-lab-demo"])
t("lab-reports", "p2", "labs", "suraj", "P0", "Reports land in the right member's records",
  "Download the report when it is ready, file it under the member, run the reader, update memory and open loops, and post the result in their chat thread.",
  "documents, entities, open_loops (0030)", main=["ai-ocr-pipeline"])
t("lab-reschedule", "p2", "labs", "athar", "P1", "Reschedule and cancel with LabStack's rules", "Show fees or cut-offs before the person confirms.", "cancel_lab_booking (0027)")
t("lab-phlebo", "p2", "labs", "athar", "P1", "Collector details in the booking card", "Name and arrival window when assigned; phone masked if LabStack offers that.", "app/labs/*")
t("lab-chat-card", "p2", "labs", "athar", "P1", "Chat booking card uses the live catalogue", "The in-thread booking card quotes LabStack's tests and price for what the longevity engine recommends.", "src/components/chat/booking.tsx")

# ---------------------------------------------------------------- p3 consults
t("con-directory", "p3", "consult", "athar", "P0", "Replace sample doctors with LabStack's directory",
  "Specialty, languages, fees, registration number and slots from the Consultation API.", "src/lib/booking/catalog.ts", main=["int-doctors", "sec-sample-data"])
t("con-book", "p3", "consult", "athar", "P0", "Book, pay and confirm a consult", "Appointments move to the server orders table; confirmation lands in the thread and the inbox.", "src/lib/booking/appointments.ts", main=["int-server-bookings"])
t("con-video", "p3", "consult", "athar", "P0", "Join the video call", "Use LabStack's room link or SDK; check whether a native SDK is needed before the next store build.", "app/appointments/*")
t("con-preconsult", "p3", "consult", "athar", "P1", "Send the pre-consultation note with consent", "The note Cheeku drafts goes to the doctor only when the person agrees, and is not kept on the phone.", "src/lib/booking/draft.ts")
t("con-erx", "p3", "consult", "suraj", "P0", "E-prescription back into memory", "Prescription record, ledger update, scorecard, and refill dates.", "src/lib/memory/ledger.ts", main=["ai-rx-score"])
t("con-guidelines", "p3", "consult", "founder", "P0", "Telemedicine Practice Guidelines check", "Doctor registration shown, consent captured, prescription rules for teleconsults respected, records kept as required.")

# ---------------------------------------------------------------- p4 medicines
t("ph-search", "p4", "pharma", "suraj", "P1", "Medicine search by brand or salt", "Match what the ledger holds to LabStack's products, strength and pack size included.", "src/lib/memory/ledger.ts", main=["ai-brand-salt"])
t("ph-rx-check", "p4", "pharma", "athar", "P0", "Prescription upload and verification", "Reuse the person's prescription records; schedule H and H1 medicines only with a valid prescription.", "app/records/*")
t("ph-order", "p4", "pharma", "athar", "P0", "Cart, order, delivery tracking and cancellation", "Through the gateway, onto the orders table, updates in the thread.", "src/lib/services/*", main=["int-services"])
t("ph-refill", "p4", "pharma", "athar", "P1", "Refill reminder to one-tap reorder", "When a strip is about to run out, reorder the same product.", "Your medicines (planned)", main=["loop-meds"])
t("ph-generics", "p4", "pharma", "suraj", "P2", "Generic options shown neutrally", "Show a cheaper equivalent with its salt and strength, never switch without the doctor.")

# ---------------------------------------------------------------- p5 payments
t("pay-collect", "p5", "common", "athar", "P0", "Collect payment for partner orders", "Hosted checkout through the merchant of record; order confirmed only after the payment is verified on the server.", main=["pay-care", "sec-payments-pci"])
t("pay-recon", "p5", "common", "athar", "P0", "Daily reconciliation", "Our orders against LabStack's statement and the payment gateway; mismatches go to a report.")
t("pay-refunds", "p5", "common", "athar", "P1", "Refunds and cancellation fees", "One flow for all three services, matching LabStack's rules.")
t("pay-invoices", "p5", "common", "athar", "P1", "GST invoices filed into records", "Invoices already have a record type (0028); file each one under the member.", "migration 0028 (invoices)")

# ---------------------------------------------------------------- p6 go-live
t("gl-uat", "p6", "common", "athar", "P0", "End-to-end test in the sandbox", "At least 20 lab orders, 10 consults and 10 medicine orders across five cities, including cancellations and failures.")
t("gl-monitor", "p6", "common", "athar", "P0", "Partner API monitoring and a safe fallback", "Error rate, latency and webhook lag alerts; if LabStack is down, booking says it is paused instead of failing halfway.")
t("gl-support", "p6", "common", "founder", "P0", "Support playbook", "Missed collection, late report, failed delivery, wrong medicine: who answers the family and how fast.")
t("gl-rollout", "p6", "common", "founder", "P1", "Start in one or two cities with beta families", "Expand once the funnel and support load look right.")
t("gl-metrics", "p6", "common", "athar", "P1", "Booking funnel and revenue metrics", "Intent, quote, order, completed, revenue per booking, all without health data.")

# ================================================================== APIs
A = []
def a(id, service, cap, why, plugs, order):
    A.append(dict(id=id, service=service, capability=cap, why=why, plugsInto=plugs, endpoint="", notes="", state="confirm", order=order))
o = 0
for row in [
    ("labs-catalogue", "labs", "Test and package catalogue with prices", "Booking card, Labs screens", "lab_tests, lab_offers"),
    ("labs-service", "labs", "Pincode serviceability", "Before showing slots", "app/labs/*"),
    ("labs-slots", "labs", "Collection slots", "Slot picker", "app/labs/*"),
    ("labs-create", "labs", "Create order", "Book a test", "create_lab_booking"),
    ("labs-status", "labs", "Order status (read)", "Booking page, fallback to webhooks", "lab_bookings"),
    ("labs-webhook", "labs", "Status and report-ready webhooks", "Live updates", "partner-webhook"),
    ("labs-reschedule", "labs", "Reschedule", "Change slot", "lab booking page"),
    ("labs-cancel", "labs", "Cancel", "Cancel booking", "cancel_lab_booking"),
    ("labs-collector", "labs", "Collector assignment details", "Who is coming, when", "lab booking page"),
    ("labs-report", "labs", "Report download (PDF)", "File into records", "documents"),
    ("labs-values", "labs", "Structured result values", "Skip OCR, straight to memory", "entities"),
    ("labs-invoice", "labs", "Invoice", "Records and GST", "documents (invoice)"),
    ("con-specialties", "consult", "Specialties and doctor directory", "Doctors hub", "src/lib/booking/catalog.ts"),
    ("con-slots", "consult", "Doctor availability", "Slot picker", "app/book/*"),
    ("con-book", "consult", "Book a consult", "Confirm booking", "appointments"),
    ("con-video", "consult", "Video room link or SDK", "Join call", "app/appointments/*"),
    ("con-status", "consult", "Consult status and webhooks", "Reminders, no-shows", "partner-webhook"),
    ("con-cancel", "consult", "Cancel or reschedule", "Change plans", "appointments"),
    ("con-notes", "consult", "Send pre-consultation note", "Doctor sees the story", "booking draft"),
    ("con-erx", "consult", "E-prescription and consult summary", "Into memory", "documents, ledger"),
    ("ph-search", "pharma", "Product search by brand or salt", "Find the medicine", "ledger matcher"),
    ("ph-service", "pharma", "Serviceability and delivery estimate", "Before checkout", "medicines flow"),
    ("ph-rx", "pharma", "Prescription upload and verification", "Schedule H medicines", "prescription records"),
    ("ph-price", "pharma", "Cart pricing", "One price shown", "medicines flow"),
    ("ph-order", "pharma", "Place order", "Checkout", "partner_orders"),
    ("ph-status", "pharma", "Order and delivery status, webhooks", "Tracking", "partner-webhook"),
    ("ph-cancel", "pharma", "Cancel or return", "Change of mind, wrong item", "medicines flow"),
    ("ph-generic", "pharma", "Substitutes and generics", "Cheaper equivalent", "ledger matcher"),
    ("common-auth", "common", "Authentication and key rotation", "Server-side only", "partner-gateway"),
    ("common-sign", "common", "Webhook signing and retries", "Trust incoming events", "partner-webhook"),
    ("common-errors", "common", "Error format, rate limits, pagination", "Reliable client", "partner-gateway"),
    ("common-sandbox", "common", "Sandbox environment and test data", "Build before go-live", "staging"),
    ("common-settlement", "common", "Settlement statement or API", "Reconciliation", "pay-recon"),
]:
    o += 1; a(*row, o)

# ============================================================= questions
Q = []
def q(id, topic, service, question, why):
    Q.append(dict(id=id, topic=topic, service=service, question=question, why=why, answer="", answered=False, order=len(Q)))
q("q-sandbox", "Access", "common", "Is there a sandbox for all three APIs, and how do we get keys?", "Lets us build the whole flow before any money moves.")
q("q-auth", "Access", "common", "How do calls authenticate (API key, OAuth, signed requests), and can keys be rotated?", "Decides how the gateway stores and refreshes credentials.")
q("q-coverage", "Coverage", "labs", "Which cities and pincodes get home collection today, and which labs are on the network (NABL)?", "Decides where we launch booking first.")
q("q-values", "Data", "labs", "Do reports come with structured values (test codes, units, ranges) as well as the PDF?", "Structured values go straight into memory; PDFs need the reader.")
q("q-codes", "Data", "labs", "Which test coding do you use (your own codes, LOINC)?", "Our longevity engine maps its retest intents to your catalogue.")
q("q-webhooks", "Tech", "common", "Which events do you push by webhook, how are they signed, and how do retries work?", "Status must come from you, not from a clock.")
q("q-limits", "Tech", "common", "What are the rate limits, timeouts and uptime commitments?", "Sizing the gateway and the fallback when you are down.")
q("q-mor", "Commercial", "common", "Who is merchant of record: Cheeku or LabStack? Who issues the invoice and collects GST?", "Changes payments, invoices and refunds.")
q("q-pricing", "Commercial", "common", "What price do we pay versus MRP, and can we set our own price or markup?", "Our model is partner price plus markup.")
q("q-settlement", "Commercial", "common", "How and when do settlements and refunds work?", "Reconciliation and refund flows depend on it.")
q("q-brand", "Brand", "common", "Can we show the lab or doctor brand to families, or is it white-label?", "Our listings currently show placeholders.")
q("q-dpa", "Compliance", "common", "Will you sign a DPA under DPDP, and where is patient data stored?", "We send only the minimum and must say where it goes.")
q("q-consult-video", "Tech", "consult", "Is video a link we open, or an SDK we embed? Any native requirements?", "Decides whether the next store build needs native changes.")
q("q-erx", "Data", "consult", "Do consults return an e-prescription and summary through the API?", "Feeds the medicine ledger and scorecard.")
q("q-tpg", "Compliance", "consult", "How do you meet the Telemedicine Practice Guidelines (registration, consent, prescription rules)?", "We are responsible for what families see.")
q("q-rx-verify", "Compliance", "pharma", "How is a prescription verified for schedule H medicines, and who does it?", "Medicines can't ship without it.")
q("q-pharma-coverage", "Coverage", "pharma", "Where do you deliver medicines, and how fast?", "Refill reminders only make sense where delivery works.")
q("q-support", "Operations", "common", "Who do we escalate to when a collection is missed or a report is late?", "Families will ask us first.")

# ============================================================= linked
LINKED = [
    ("int-lab-partner", "Lab partner integration end to end"),
    ("int-doctors", "Real doctor consults and video"),
    ("int-services", "Services marketplace provider"),
    ("int-server-bookings", "Move appointments and service requests to the server"),
    ("pay-care", "Payments for lab tests and consults"),
    ("pay-markup", "Markup rules and a price breakdown"),
    ("sec-lab-demo", "Stop lab bookings moving on the clock"),
    ("sec-listings", "Replace real lab brands that carry made-up prices"),
    ("sec-sample-data", "Keep sample doctors and sample reviews out of production"),
    ("sec-payments-pci", "Payments without touching card data"),
    ("ai-ocr-pipeline", "Asynchronous extraction pipeline"),
    ("ai-brand-salt", "Brand to salt resolver"),
    ("ai-rx-score", "Prescription scorecard engine"),
    ("loop-meds", "Your medicines: doses, Taken, refills"),
]

DEAL = dict(
    title="Varun, LabStack's founder, has agreed to open the LabStack network to Cheeku through its APIs.",
    summary="Lab tests, doctor consultations and medicine delivery, available when we are ready for them. We haven't gone deep yet: the plan is to finish the app and the longevity use case first, then open access. This tracker holds what we prepare now and what each phase will need.",
    facts=[["Partner", "LabStack"], ["Contact", "Varun, founder"], ["Offered", "Network commerce access through LabStack's API platform"],
           ["Status", "Verbal, no agreement, sandbox or keys yet"], ["Our phase", "Prepare: build the app and longevity use case"],
           ["API docs", "Labs, Consultation and Pharma docs shared; endpoint review pending"]],
    currentPhase="p0", launchTracker=LAUNCH,
)

def dump(coll, id, data):
    os.makedirs(os.path.join(OUT, coll), exist_ok=True)
    with open(os.path.join(OUT, coll, id + ".json"), "w") as f:
        json.dump(data, f, ensure_ascii=False)

for i, x in enumerate(T):
    d = {k: v for k, v in x.items() if k != "id"}; d.update(order=i, updatedAt=AT, completedAt=None); dump("tasks", x["id"], d)
for x in A:
    d = {k: v for k, v in x.items() if k != "id"}; d["updatedAt"] = AT; dump("apis", x["id"], d)
for x in Q:
    d = {k: v for k, v in x.items() if k != "id"}; d["updatedAt"] = AT; dump("questions", x["id"], d)
for i, (lid, title) in enumerate(LINKED):
    dump("linked", lid, dict(title=title, status="todo", order=i, syncedAt=AT))
dump("meta", "deal", DEAL)
dump("log", "seed", dict(at=AT, kind="note", title="Partnership tracker created from the first call with Varun and our integration points", by="claude",
                         note=f"{len(T)} tasks, {len(A)} API capabilities and {len(Q)} questions. Endpoint names wait for the docs review."))

ids = {x["id"] for x in T}
for x in T + A + Q:
    for v in x.values():
        if isinstance(v, str): assert "—" not in v, x["id"]
print(len(T), "tasks", len(A), "apis", len(Q), "questions", len(LINKED), "linked")
