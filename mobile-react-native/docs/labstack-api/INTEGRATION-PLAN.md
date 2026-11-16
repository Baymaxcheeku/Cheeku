# LabStack integration plan: Labs, Pharmacy, Consultations

Written 16 Nov 2026 from the full API specs in this folder (`README.md`, `raw/*.openapi.json`). For Archit and whoever runs tonight's sandbox tests. Every field rule below is quoted from the spec; the app must check the same rules before it calls, so a person never sees a LabStack 400.

## 1. The shape

```
app screen ──> Edge Function `labstack` (gateway) ──> integration.labstack.in
                 holds ls-api-key, checks input again,
                 maps our profile to LabStack's patient,
                 writes our order row
LabStack ──> Edge Function `labstack-webhook` ──> verify, de-duplicate, then pull
                 getOrderDetails / getAppointmentDetails, update our row,
                 notify the inbox, Cheeku's chat note follows on its own
```

- The app never calls LabStack and never holds the key.
- Secrets (Supabase Edge Function secrets, set by the owner, never in chat or code): `LABSTACK_API_KEY`, `LABSTACK_BASE_URL` (`https://integration.labstack.in` for UAT; production host still to get from LabStack), `LABSTACK_WEBHOOK_SECRET` (labs/pharma store header), `LABSTACK_SIGNING_SECRET` (provider `x-labstack-signature`, HMAC-SHA256 of the raw body).
- The gateway takes an allow-list of operations (`labs.slots`, `labs.place`, `pharma.estimate`, ...), never a raw path.
- Webhooks are a prompt to pull: key on `orderId + event + status`, then fetch the order. Delivery is at least once.
- Errors: `{status: "failure", error}`; 401 means the key is wrong or expired (alert, don't retry); 429 means wait `Retry-After`.

## 2. One patient, three APIs

Every order carries a patient. One mapper, `src/lib/partner/patient.ts`, used by all three:

| LabStack field | Rule | From Cheeku |
| --- | --- | --- |
| `uniqueId` | our id for the patient | `profiles.id` |
| `mainUserUniqueId` + `relationship` | dependant of the account holder | primary profile id; relationship mapped below |
| `name` | letters, digits, spaces; 1 to 50 | `profiles.name` |
| `gender` | `MALE` / `FEMALE` / `OTHERS`; required for labs and pharmacy | `profiles.sex`; `prefer_not_to_say` or empty: ask at checkout |
| `dateOfBirth` or `age` | YYYY-MM-DD, not in the future; age 0 to 120 | `profiles.dob` |
| `mobile` | 10 digits, not starting with 0 (`+91`, spaces, dashes stripped) | `profiles.phone`, else the account holder's sign-in phone |
| `email` | required for labs and consults | **not stored per member today**: account holder's email, editable at checkout |
| `altContact` / `altNumber` | optional 10 digits | the account holder's phone when booking for someone else |

Relationship map (our list is Mother, Father, Spouse, Son, Daughter, Sister, Brother, Grandparent, Someone else): Spouse becomes `WIFE`/`HUSBAND` by sex, Grandparent becomes `GRANDMOTHER`/`GRANDFATHER` by sex, Someone else becomes `OTHER`, the rest map by name.

## 3. One address, three APIs

Today labs take one free-text box. All three APIs want parts. One shared form, `AddressForm`, prefilled from `member_locations` (which already has locality, city, state, pincode, lat, lng):

| Field | Rule |
| --- | --- |
| `unitFloorBuilding` | optional, flat / floor / building |
| `address` | street; required for home collection, home delivery, home visit; pharmacy max 200 |
| `locality` | optional |
| `city`, `state` | required for home collection, home delivery, home visit |
| `pincode` | always 6 digits |
| `latitude`, `longitude` | optional, send when we have them |
| labs only | the whole address (`unit, address, locality, city, state`) must be 20 to 200 characters |

Saved per member (new `addresses` jsonb on `member_locations`, or an `addresses` table), so the second order is one tap.

## 4. Labs (34 endpoints; tonight: 14)

| Screen | Calls | What changes |
| --- | --- | --- |
| Lab tests list `app/labs/index.tsx` | `getTests`, `getPackages`, `getPackageTags` (synced into `lab_tests` nightly by the gateway, with `ls_id`) | Our ids (`hba1c`) gain the LabStack id (`LSL110001` / `LSP11002`); prices from LabStack plus our markup. A banner when the pincode isn't served (`checkServiceability`). |
| Test page `app/labs/test/[id].tsx` | `getTest`, `getPackagePreparations`, `getSampleReport` | Real fasting and preparation text; "See a sample report". |
| Choose lab `app/labs/choose.tsx` | `checkServiceability(pincode, testIds/packageIds, service)`, `getLabs` | Only labs that serve this pincode and offer every test. |
| Book `app/labs/book.tsx` (rebuild) | `getSlots(date, pincode or lat/lng, service, labId)` then `placeOrder` | **Patient card** (section 2), **AddressForm** (section 3), **home or centre visit** (`orderType` `HOME_SAMPLE` / `CENTER_VISIT`), **real slots** replacing our fixed two-hour windows (`appointment` is an exact ISO time; date not before today IST), **notes** (optional, e.g. "veins are thin"). `referenceId` = our booking id. |
| Booking `app/labs/booking/[id].tsx` | `getOrderDetails`, `rescheduleOrder(orderId, appointment)`, `cancelOrder(orderId, reason)`, `escalation`, `submitFeedback` | Ten-step timeline from LabStack (below), collector name and number once assigned, Reschedule sheet (new), Cancel with reason, "Report a problem" sheet (new, escalation), rating goes to `submitFeedback`. |
| Result | `getReport` (PDF), `getReportRawValues` | PDF filed as the document; raw values become `entities` directly (no OCR), so chat, areas and the report note work the moment `REPORT_DELIVERED` lands. 202 means retry; 400 after delivery needs LabStack support. |
| Not bookable online | `placeRequest`, `linkToOrder` | Later: "Ask the lab" for a slip with tests not in the catalogue. |

Home collection lifecycle (from `triggerOrderLifecycle`): PENDING, CREATED, ORDER_SCHEDULED, PHLEBO_ASSIGNED, PHLEBO_STARTED, SAMPLE_COLLECTED, SAMPLE_IN_TRANSIT, SAMPLE_DELIVERED, SAMPLE_PROCESSED, REPORT_DELIVERED; side states RESCHEDULED, CANCELED, PARTIAL_DELIVERED, PHLEBO_NO_SHOW, SAMPLE_REJECTED. Our timeline shows five steps (Booked, Collector assigned, On the way, Sample collected, Report ready) and maps the rest into them.

Retire: `sync_lab_bookings()` and `advance_lab_booking_demo()` (the clock-driven fake statuses) once the webhook lands.

## 5. Pharmacy (9 endpoints; all needed)

Today there is no ordering, only a refill request. New flow, `app/medicines/order/*`:

| Step | Calls | Screen |
| --- | --- | --- |
| 1. What to order | `searchDrugs(query ≥ 3 chars)`, `getDrugDetails`, `getAlternatives` | **Cart** (new). Prefilled from the medicine list (refill) or a prescription record ("Order these"). Each line is matched to a `drugMasterId` (a brand and pack, not a salt); the person confirms the pack. "Same salt, cheaper" from alternatives, never swapped automatically. `notForSale` items (Schedule X, habit-forming) can't be added. Quantity 1 to 100. |
| 2. Where | `checkServiceability(pincode, orderType, shipmentSpeed)` | **Delivery** (new): AddressForm, home delivery or pickup (range ≤ 10 km), speed (`STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA`) from what the pharmacy offers. Picks `lsPharmacyId`. |
| 3. Price | `getEstimate` | **Review** (new): items, MRP, discount, delivery, total. |
| 4. Prescription | in `placeOrder.documents` or `uploadPrescription` | When any drug is `prescriptionRequired`: attach from records (pdf, jpg, jpeg, png; ≤ 10 MB; base64 by the gateway). |
| 5. Place | `placeOrder` | Patient card; `referenceId` = our order id. |
| 6. Track | `getOrderDetails`, webhook, `cancelOrder(reason ≤ 500)` | **Order** (new): status, tracking id, split deliveries (`relatedOrders`), pickup address for pickup, cancel. **Orders list** (new). |

Statuses seen in the spec: PENDING, CREATED, PLACED, CONFIRMED, SHIPPED, PARTIAL_DELIVERED, FULL_DELIVERED, COMPLETED, CANCELLED. The webhook carries `event` (orderStatus, paymentStatus, shipmentSpeed, pharmacy, drugs); then pull `getOrderDetails`.

Where it connects: the medicine ledger (doses and strip counts) gains "Order a refill" per medicine and "Order all"; a delivered order tops up the strip count; Cheeku's chat note says it's on the way and when it arrives.

## 6. Consultations (32 endpoints; tonight: 12)

| Screen | Calls | What changes |
| --- | --- | --- |
| Pre-consult interview `app/book/consult.tsx` | none | Keep. Its note becomes `notes`; for instant consults, `clinicalContext` (chief complaint, allergies, medications, blood group, brief history, each ≤ 500, only with consent). |
| Doctors `app/book/doctors.tsx` | `getSpecialities(providerType)`, `getProviders(providerType, appointmentType ONLINE/CENTER_VISIT, speciality, pincode)` | Replace the sample doctors. |
| Doctor `app/book/doctor/[id].tsx` | `getProviderDetails`, `getDiscounts` | Real profile, fees, languages. |
| Slot `app/book/slot.tsx` | `getAppointmentSlots(providerType, appointmentType, date, providerIds)` | Real slots (20 per page). |
| Confirm (new step) | `bookAppointment`, `uploadDocument` | Patient card, `meetingType` VIDEO or AUDIO_ONLY, coupon, follow-up of an earlier visit. **`storeSuggestedTestIds`**: the tests Cheeku already knows are due (HbA1c, lipid profile) go to the doctor as suggestions. Share reports with consent (`docType` PRIOR_PRESCRIPTION / REFERRAL / OTHER). |
| Appointment `app/appointments/[id].tsx` | `getAppointmentDetails`, `getAuthenticatedMeetingLink`, `rescheduleAppointment`, `cancelAppointment`, `getPrescriptionPdf`, `submitFeedback`, `escalation` | **Join call** button (link opened in the browser), reschedule, cancel, report a problem. The e-prescription PDF is filed into the person's records and runs through the prescription check, so the chat's "How did the visit go?" note becomes "I've read Dr X's prescription". |
| Instant consult (new) | `createInstant`, `getInstantStatus`, `cancelInstant`, webhook | **Waiting screen** (new): "Finding a doctor", then join. Entry from chat's "Online consultation". |

Appointments move from phone storage (`cheeku.appointments`) to a server table, so the family sees them on every phone. Statuses seen: CREATED, CONFIRMED, RESCHEDULED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELED, PATIENT_NO_SHOW, PROVIDER_NO_SHOW, plus instant states (PENDING, CLAIMED, EXPIRED).

## 7. Database (migration 0045)

- `lab_tests`: `ls_id`, `ls_kind` (test or package), `synced_at`.
- `lab_bookings`: `ls_order_id`, `ls_status`, `order_type`, `appointment_at`, `phlebo` jsonb, `address_parts` jsonb, `report_values_at`; `slot_window` becomes nullable.
- `pharma_orders`, `pharma_order_items`: our id is the `referenceId`; `ls_order_id`, `ls_pharmacy_id`, status, totals, tracking, `super_order_id`.
- `consult_appointments`: replaces the phone store; `ls_appointment_id`, provider, type, time, status, meeting type, prescription document id.
- `partner_events`: every webhook received (source, ids, event, status, received_at, processed_at), unique on (source, order id, event, status) for de-duplication. No health content stored.
- RLS like `lab_bookings`: the family reads its own; only the Edge Functions write.

## 8. Validation, shared by app and gateway

`src/lib/partner/validate.ts`, pure and tested, imported by the screens and copied into the Edge Function:

- mobile: strip `+91`, spaces, dashes; exactly 10 digits; not starting with 0.
- pincode: exactly 6 digits.
- name: letters, digits and spaces, 1 to 50 after cleaning.
- email: a valid address.
- date of birth: real date, not in the future; age 0 to 120.
- lab address: assembled length 20 to 200; city, state, address present for home services.
- pharmacy: quantity 1 to 100 per drug; at most 100 of one drug; search query ≥ 3 characters; note ≤ 1000; cancel reason ≤ 500.
- files: pdf, jpg, jpeg, png; ≤ 10 MB.
- slot: a time LabStack returned in `getSlots` / `getAppointmentSlots`, not one we made up.

Each error is said in plain words next to the field ("A 10-digit mobile number, without the 0 at the start").

## 9. Tonight, in order

1. Owner sets the four secrets in Supabase (Edge Functions, Secrets). Nobody pastes keys in chat.
2. Gateway `labstack`: `admin/status`, then Labs `getTests` and `getPackages` to sync the catalogue.
3. Labs end to end on UAT: serviceability, slots, `placeOrder`, then `triggerOrderLifecycle` to REPORT_DELIVERED, with `testWebhook` to check the receiver. Confirm raw values land in records.
4. Pharmacy: search, serviceability, estimate, place, cancel.
5. Consults: specialities, providers, slots, book, meeting link, cancel; provider `testWebhook` with the signature check.
6. Give LabStack our two webhook URLs (labs/pharmacy, provider) and agree the store header.

## 10. Open questions for LabStack

- Production base URL (only `integration.labstack.in` is documented).
- The labs and pharmacy webhook header name and how the secret is issued.
- Payment: postpaid (pay after collection), LabStack's 16-minute payment link (`isPaymentRequired`), or our own gateway; and how our markup is settled against the wallet (`getBalance`).
- Whether `uniqueId` can be our profile UUID (36 characters; pharmacy allows up to 100).
- Catalogue size and how often prices change (sync cadence).
