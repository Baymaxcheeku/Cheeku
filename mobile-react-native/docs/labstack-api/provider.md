# Provider API (LabStack) v1.0.28

Source: https://integration.labstack.in/api-docs/provider (OpenAPI 3.0.0 spec embedded in the page). Raw spec: [`raw/provider.openapi.json`](raw/provider.openapi.json). Generated from that file without editing any wording; descriptions are copied verbatim.

## Overview

API for integrating telehealth and in-person provider consultations — speciality discovery, provider search, appointment booking, document management, and video consultations. All requests must include a valid `ls-api-key` header.

## Instant consult webhooks

If you give us a webhook URL and a signing secret, we POST a small JSON notification to it as an instant consult moves on, so you do not have to poll `getInstantStatus` to the end. Delivery is at least once: the same event may arrive twice, so treat `requestId` and `event` together as the key and make handling them repeatable. A delivery that fails is retried for a while and then given up on, so treat the webhook as a prompt to pull rather than as the only way you will hear.

### Events

| `event` | Meaning |
| --- | --- |
| `consult.claimed` | A doctor accepted the request. Call `getInstantStatus` for the joining link. |
| `consult.expired` | The request reached its `expiresAt` with no doctor. |
| `consult.canceled` | The request was withdrawn. |
| `consult.doctor_no_show` | The doctor who accepted never joined; the request is open again. |
| `meeting.ended` | The consultation call finished. |
| `consult.completed` | The consultation was completed. |
| `prescription.ready` | A prescription is available for the consultation. |

### Body

```json
{ "event": "consult.claimed", "requestId": 4821, "appointmentId": 91245, "storeId": 17, "ts": "2026-09-27T10:31:04.000Z" }
```

It deliberately carries no patient details — it tells you that something changed and which request it was, and you read the rest from the API.

### Verifying it came from us

Every delivery carries an `x-labstack-signature` header: the HMAC-SHA256 of the raw request body, keyed with your signing secret, hex encoded. Compute the same over the body exactly as received, before any parsing or re-serialising, and compare using a constant-time comparison. Reject anything that does not match.

Contact: LabStack Support https://console.labstack.in

Servers: `https://integration.labstack.in`

## Authentication

`ApiKeyAuth`: type `apiKey`, in `header`, header name `ls-api-key`. Send `ls-api-key: <YOUR_API_KEY>`.

API key issued by LabStack. Pass this in every request header. Your store can hold two active keys at once, so you can move to a new key before the old one is revoked. A key may have an expiry date; a request made with an expired or revoked key is refused as unauthorized.

## Shared components

### Schema `ErrorResponse`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

### Unauthorized

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

### TooManyRequests

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

### BadRequest

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

## Endpoints

- [GET /api/v1.0/admin/getBalance](#get-apiv10admingetbalance): Get wallet balance
- [GET /api/v1.0/admin/status](#get-apiv10adminstatus): Service health check
- [POST /api/v1.0/appointment/bookAppointment](#post-apiv10appointmentbookappointment): Book an appointment
- [GET /api/v1.0/appointment/cancelAppointment](#get-apiv10appointmentcancelappointment): Cancel an appointment
- [DELETE /api/v1.0/appointment/deleteAllDocuments](#delete-apiv10appointmentdeletealldocuments): Delete all appointment documents
- [DELETE /api/v1.0/appointment/deleteDocument](#delete-apiv10appointmentdeletedocument): Delete an appointment document
- [POST /api/v1.0/appointment/escalation](#post-apiv10appointmentescalation): Raise an appointment escalation
- [GET /api/v1.0/appointment/getAppointmentDetails](#get-apiv10appointmentgetappointmentdetails): Get appointment details
- [GET /api/v1.0/appointment/getAppointments](#get-apiv10appointmentgetappointments): List appointments
- [GET /api/v1.0/appointment/getAuthenticatedMeetingLink](#get-apiv10appointmentgetauthenticatedmeetinglink): Get authenticated meeting link
- [GET /api/v1.0/appointment/getDocument](#get-apiv10appointmentgetdocument): Download an appointment document
- [GET /api/v1.0/appointment/getEscalationDetails](#get-apiv10appointmentgetescalationdetails): Get appointment escalation details
- [GET /api/v1.0/appointment/getEscalationImage](#get-apiv10appointmentgetescalationimage): Download an escalation image
- [GET /api/v1.0/appointment/getEscalations](#get-apiv10appointmentgetescalations): List appointment escalations
- [GET /api/v1.0/appointment/getPrescriptionPdf](#get-apiv10appointmentgetprescriptionpdf): Download prescription PDF
- [GET /api/v1.0/appointment/rescheduleAppointment](#get-apiv10appointmentrescheduleappointment): Reschedule an appointment
- [POST /api/v1.0/appointment/submitFeedback](#post-apiv10appointmentsubmitfeedback): Submit appointment feedback
- [GET /api/v1.0/appointment/testWebhook](#get-apiv10appointmenttestwebhook): Trigger a test appointment webhook
- [POST /api/v1.0/appointment/uploadDocument](#post-apiv10appointmentuploaddocument): Upload appointment documents
- [GET /api/v1.0/availability/getAppointmentSlots](#get-apiv10availabilitygetappointmentslots): Get appointment slots
- [GET /api/v1.0/availability/getDiscounts](#get-apiv10availabilitygetdiscounts): List appointment discounts
- [GET /api/v1.0/availability/getProcedure](#get-apiv10availabilitygetprocedure): Get procedure details
- [GET /api/v1.0/availability/getProcedures](#get-apiv10availabilitygetprocedures): List procedures
- [GET /api/v1.0/availability/getProviderTagCategories](#get-apiv10availabilitygetprovidertagcategories): List provider tag categories
- [GET /api/v1.0/availability/getProviderTags](#get-apiv10availabilitygetprovidertags): List provider tags
- [GET /api/v1.0/availability/getProviders](#get-apiv10availabilitygetproviders): Search providers
- [GET /api/v1.0/availability/getSpecialities](#get-apiv10availabilitygetspecialities): List specialities
- [POST /api/v1.0/consult/cancelInstant](#post-apiv10consultcancelinstant): Cancel an instant consult request
- [POST /api/v1.0/consult/createAdditionalParticipant](#post-apiv10consultcreateadditionalparticipant): Add an observer to a consult
- [POST /api/v1.0/consult/createInstant](#post-apiv10consultcreateinstant): Request an instant consult for a patient
- [GET /api/v1.0/consult/getInstantStatus](#get-apiv10consultgetinstantstatus): Check an instant consult request
- [GET /api/v1.0/network/getProviderDetails](#get-apiv10networkgetproviderdetails): Get provider details

## Admin

### GET /api/v1.0/admin/getBalance

**Get wallet balance**

Tag: Admin · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the store's LabStack wallet balance (currently a stub returning 0).

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `walletBalance` | integer | no |  |  | 0 |

Example:
```json
{
  "status": "success",
  "walletBalance": 0
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/admin/status

**Service health check**

Tag: Admin · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Verifies database connectivity.

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `healthy` | boolean | no |  |  | true |

Example:
```json
{
  "status": "success",
  "healthy": true
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 503

Service unhealthy

---

## Appointment

### POST /api/v1.0/appointment/bookAppointment

**Book an appointment**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates an appointment (ONLINE teleconsult, HOME_VISIT, or CENTER_VISIT) with a provider or provider group for the authenticated store. Provide either lsProviderId or lsGroupId. The patient's gender and dateOfBirth (or age) are optional. For a patient already on record (same uniqueId), a booking only fills in a gender or date of birth not yet recorded and never changes a recorded one; use POST /api/admin/v1.0/user/updateUserDetails to change them. Supports follow-up bookings and an optional pre-appointment payment link, which defaults to the amount payable for the booking unless a lower paymentAmount is supplied. That link is valid for 16 minutes and the appointment is auto-cancelled if payment is not completed in that window.
The store's appointment discounts (see GET /api/v1.0/availability/getDiscounts) are applied automatically to a booking with a confirmed provider slot and procedure; pass couponCode to use one that needs a code. At most one discount applies, and the response's discount object says which. Follow-ups and provider-group bookings never take a discount.
storeSuggestedTestIds and storeSuggestedPackageIds recommend lab tests and packages to the doctor. They are shown ahead of everything else when the doctor writes the prescription for this appointment, and the doctor decides whether to prescribe them. They can only be set when booking.
Some providers need a ten-digit Indian mobile number that is the patient's own, not shared with another patient such as the main user, a valid email address, and the patient's gender and date of birth (sent as gender and dateOfBirth or age, or already on record for the patient), and cannot take isPaymentRequired, paymentAmount, couponCode or isFollowUp. A booking with one of them that cannot meet this fails with 400 saying why, and nothing is booked. Rarely a booking cannot be completed right now: it then fails with 500, nothing stays booked, and trying again is safe.
checkInUrl is the patient's clinic check-in link. At the clinic, the patient opens it and checks in by scanning the QR code at the reception, or by typing the code printed under it where there is one. Check-in opens on the day of the appointment. Once the patient checks in, the appointment is CHECKED_IN with customerArrivalTime set, and your appointments webhook is sent. checkInUrl is set for a CENTER_VISIT at a clinic that offers check-in, and is null otherwise. When it is set, send it to the patient before the visit or open it in your app, as they need it at the clinic; getAppointmentDetails returns it too. Ask your account manager about turning on clinic check-in for your providers.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `lsProviderId` | integer | no |  |  | 42 |
| `lsGroupId` | integer | no | alternative to lsProviderId |  | 7 |
| `lsProcedureId` | integer | no |  |  |  |
| `preferredGender` | string | no |  | enum: `MALE`, `FEMALE` |  |
| `appointmentType` | string | yes |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `referenceId` | string | no | optional external ref |  |  |
| `appointment` | string (date-time) | yes |  |  | "2025-06-01T11:00:00+05:30" |
| `notes` | string | no |  |  |  |
| `uniqueId` | string | no | optional; auto-generated if omitted |  | "CUST001" |
| `name` | string | yes |  |  | "Ravi Kumar" |
| `email` | string (email) | yes |  |  |  |
| `mobile` | string | yes | 10 digits |  |  |
| `altContact` | string | no |  |  |  |
| `dateOfBirth` | string (date) | no | Optional. Cannot be in the future. Takes precedence over age when both are given. Ignored if the patient already has a date of birth on record. |  |  |
| `age` | integer | no | Optional. Whole years, used when dateOfBirth is not given. Ignored if the patient already has a date of birth on record. |  |  |
| `gender` | string | no | Optional. Ignored if the patient already has a gender on record. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `mainUserUniqueId` | string | no |  |  |  |
| `relationship` | string | no |  | enum: `OTHER`, `HUSBAND`, `WIFE`, `FATHER`, `MOTHER`, `SON`, `DAUGHTER`, `GRANDFATHER`, `GRANDMOTHER`, `GRANDSON`, `GRANDDAUGHTER`, `SON_IN_LAW`, `DAUGHTER_IN_LAW`, `BROTHER`, `SISTER`, `BROTHER_IN_LAW`, `SISTER_IN_LAW`, `UNCLE`, `AUNT`, `COUSIN`, `NEPHEW`, `NIECE`, `MOTHER_IN_LAW`, `FATHER_IN_LAW`, `PARTNER`, `FRIEND`, `NEIGHBOUR` |  |
| `unitFloorBuilding` | string | no |  |  |  |
| `address` | string | no | required for HOME_VISIT |  |  |
| `locality` | string | no |  |  |  |
| `city` | string | no | required for HOME_VISIT |  |  |
| `state` | string | no | required for HOME_VISIT |  |  |
| `pincode` | string | no | required for HOME_VISIT/CENTER_VISIT |  |  |
| `latitude` | number | no |  |  |  |
| `longitude` | number | no |  |  |  |
| `meetingType` | string | no | teleconsultation; default VIDEO | enum: `VIDEO`, `AUDIO_ONLY` |  |
| `isPaymentRequired` | boolean | no | Optional. If true a payment link valid for 16 minutes is returned, and the appointment is auto-cancelled (releasing the slot) if it is not paid within that window. Defaults to false. |  |  |
| `paymentAmount` | number | no | Optional. Amount (in INR) the customer is asked to pay, used only when isPaymentRequired is true. Must be greater than 0, have at most 2 decimal places, and must not exceed the amount payable for the booking: the configured cost of the procedure on the booked slot, less any discount. Omit to charge that amount. Not supported for provider-group requests, which have no confirmed slot. |  | 350 |
| `couponCode` | string | no | Optional. A coupon code for one of the store's appointment discounts. Matched without regard to case. If the coupon cannot be used on this booking, or has reached its usage limit, the request fails with 400 and no appointment is created. |  | "CONSULT10" |
| `isFollowUp` | boolean | no | requires previousAppointmentId |  |  |
| `previousAppointmentId` | integer | no |  |  |  |
| `storeSuggestedTestIds` | array<string> | no | Optional. LabStack test ids (the lsId of a test in the Labs API catalogue) to recommend to the doctor when writing a prescription. Duplicates are ignored. At most 50 ids across storeSuggestedTestIds and storeSuggestedPackageIds combined. An id not in the catalogue, or more than 50 in all, fails with 400 and nothing is booked. |  |  |
| `storeSuggestedPackageIds` | array<string> | no | Optional. LabStack package ids (the packageId of a package in the Labs API catalogue) to recommend to the doctor when writing a prescription. Duplicates are ignored. At most 50 ids across storeSuggestedTestIds and storeSuggestedPackageIds combined. An id not in the catalogue, or more than 50 in all, fails with 400 and nothing is booked. |  |  |

Example:
```json
{
  "lsProviderId": 42,
  "lsProcedureId": 1,
  "appointmentType": "HOME_VISIT",
  "referenceId": "REF-123",
  "appointment": "2025-06-01T11:00:00+05:30",
  "notes": "Patient prefers a morning slot.",
  "uniqueId": "CUST001",
  "name": "Bob Smith",
  "email": "bobsmith@example.com",
  "mobile": "8047359194",
  "altContact": "8047359194",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "unitFloorBuilding": "2nd Floor Tower 3",
  "address": "123 Main Road",
  "locality": "Gopalapur",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560035",
  "meetingType": "VIDEO",
  "isPaymentRequired": false,
  "couponCode": "CONSULT10",
  "storeSuggestedTestIds": [
    "LSL100336",
    "LSL102387"
  ],
  "storeSuggestedPackageIds": [
    "LSP10538"
  ]
}
```

#### Responses

##### 200

Appointment booked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `appointment` | object | no |  |  |  |
| `appointment.appointmentId` | integer | no |  |  |  |
| `appointment.appointmentStatus` | string | no | CREATED when the booking is waiting for the provider to confirm it, which is the default. CONFIRMED when the provider has auto-confirmation switched on, in which case no further action is needed. PENDING when the appointment still requires payment. | enum: `CREATED`, `CONFIRMED`, `PENDING` |  |
| `appointment.appointmentType` | string | no |  |  |  |
| `appointment.referenceId` | string, nullable | no |  |  |  |
| `appointment.lsGroupId` | integer, nullable | no |  |  |  |
| `appointment.lsProviderId` | integer, nullable | no |  |  |  |
| `appointment.providerName` | string, nullable | no |  |  |  |
| `appointment.meetingLink` | string, nullable | no |  |  |  |
| `appointment.followUpDays` | integer, nullable | no | Free follow-up window (days) starting from this appointment; null if not configured or this booking is itself a follow-up | minimum: `0` |  |
| `appointment.followUpUntil` | string, nullable | no |  |  |  |
| `appointment.isFollowUp` | boolean | no |  |  |  |
| `appointment.storeSuggestedTestIds` | array<string> | no | The suggested test ids as saved, trimmed and without duplicates; empty when none were given. |  |  |
| `appointment.storeSuggestedPackageIds` | array<string> | no | The suggested package ids as saved, trimmed and without duplicates; empty when none were given. |  |  |
| `appointment.checkInUrl` | string, nullable | no | The patient's clinic check-in link; null when the visit is not offered check-in. |  |  |
| `appointment.apiError` | string, nullable | no |  |  |  |
| `uniqueId` | string | no |  |  |  |
| `paymentLink` | string, nullable | no | Only returned when isPaymentRequired is true. Valid for 16 minutes from booking. |  |  |
| `paymentLinkExpiresAt` | string, nullable | no | Only returned when isPaymentRequired is true. Always 16 minutes after booking; the appointment is cancelled at this point if unpaid. |  |  |
| `previousAppointmentId` | integer, nullable | no |  |  |  |
| `discount` | object, nullable | no | The discount applied to this booking; null when none applied. |  |  |
| `discount.discountId` | string | no |  |  |  |
| `discount.name` | string | no |  |  |  |
| `discount.couponCode` | string, nullable | no | The coupon the discount required; null for a discount applied automatically. |  |  |
| `discount.baseAmount` | number | no | The configured cost of the procedure before the discount (INR). |  |  |
| `discount.discountAmount` | number | no | The amount taken off (INR). |  |  |
| `discount.payableAmount` | number | no | What the booking costs after the discount (INR). |  |  |

Example:
```json
{
  "status": "success",
  "appointment": {
    "appointmentId": 47585,
    "appointmentStatus": "CREATED",
    "appointmentType": "HOME_VISIT",
    "referenceId": "REF-123",
    "lsGroupId": null,
    "lsProviderId": 42,
    "providerName": "Dr. John Doe",
    "meetingLink": null,
    "followUpDays": 14,
    "followUpUntil": "2025-06-15T05:30:00.000Z",
    "isFollowUp": false,
    "storeSuggestedTestIds": [
      "LSL100336",
      "LSL102387"
    ],
    "storeSuggestedPackageIds": [
      "LSP10538"
    ],
    "checkInUrl": null,
    "apiError": null
  },
  "uniqueId": "CUST001",
  "paymentLink": null,
  "paymentLinkExpiresAt": null,
  "previousAppointmentId": null,
  "discount": {
    "discountId": "DISC-1727430000000-K3F9QZ",
    "name": "10% off consultations",
    "couponCode": "CONSULT10",
    "baseAmount": 800,
    "discountAmount": 80,
    "payableAmount": 720
  }
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/cancelAppointment

**Cancel an appointment**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Cancels an appointment for the store. This GET has side effects.
An appointment can be cancelled up to a fixed notice period before its scheduled time -- 30 minutes by default. Inside that period, and for an appointment the patient did not attend, cancellation is refused and the caller is directed to support. An on-demand consult can be cancelled at any time, and an appointment whose provider never joined stays cancellable after its scheduled time. An online appointment whose consultation has already taken place cannot be cancelled, even while it awaits the provider's prescription or diet chart.
If your account is set up to run its own appointment operations, appointments of the types you manage are not held to the notice period at all and can be cancelled at any time, including after their scheduled time has passed. An appointment that is already cancelled or already completed, or whose online consultation has already taken place, stays closed either way. Ask your account manager to enable this and to choose which appointment types it covers.
A cancellation can occasionally fail temporarily. The appointment is then not reported as cancelled, and repeating the call is safe.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes |  |  | 789 |
| `reason` | query | string | no |  |  |  |

#### Responses

##### 200

Appointment cancelled

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `appointment` | object | no |  |  |  |
| `appointment.appointmentId` | string | no |  |  |  |
| `appointment.appointmentStatus` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "appointment": {
    "appointmentId": "789",
    "appointmentStatus": "CANCELED"
  }
}
```

##### 400 (`BadRequest`)

The appointment can no longer be changed. Returned when the scheduled time is less than the notice period away, when the patient did not attend, when its online consultation has already taken place, or when the appointment is already cancelled or completed. The notice period and the did-not-attend rule do not apply to an account running its own appointment operations for that appointment type. Also returned, with "This appointment can no longer be cancelled. Contact support.", for an appointment that cannot be cancelled for another reason.


Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### DELETE /api/v1.0/appointment/deleteAllDocuments

**Delete all appointment documents**

Tag: Appointment · **Deprecated** · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Currently disabled - always responds 501 Not Implemented.

#### Responses

##### 200

Success

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 501

Endpoint currently disabled

---

### DELETE /api/v1.0/appointment/deleteDocument

**Delete an appointment document**

Tag: Appointment · **Deprecated** · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Currently disabled - always responds 501 Not Implemented.

#### Responses

##### 200

Success

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 501

Endpoint currently disabled

---

### POST /api/v1.0/appointment/escalation

**Raise an appointment escalation**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates a store escalation tied to an appointment.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `appointmentId` | integer | yes |  |  |  |
| `complaint` | string | yes |  |  |  |
| `severity` | string | yes |  | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |
| `description` | string | no |  |  |  |
| `notes` | string | no |  |  |  |

Example:
```json
{
  "appointmentId": 789,
  "complaint": "Provider did not join the call",
  "severity": "HIGH",
  "description": "The doctor was a no-show for the scheduled online consult.",
  "notes": "Customer waited 15 minutes before leaving."
}
```

#### Responses

##### 200

Escalation created

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `escalation` | object | no |  |  |  |
| `escalation.id` | integer | no |  |  |  |
| `escalation.complaint` | string | no |  |  |  |
| `escalation.status` | string | no |  |  |  |
| `escalation.severity` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "escalation": {
    "id": 532,
    "complaint": "Provider did not join the call",
    "status": "PENDING",
    "severity": "HIGH"
  }
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 500

Failed to create escalation

---

### GET /api/v1.0/appointment/getAppointmentDetails

**Get appointment details**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns full detail for one appointment including patient, provider, documents (as download links), and parsed prescription.
checkInUrl is the patient's clinic check-in link, as bookAppointment returns it, while the appointment is open; null when the visit is not offered check-in. When the patient checks in, appointmentStatus becomes CHECKED_IN and customerArrivalTime is set.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes |  |  | 789 |

#### Responses

##### 200

Appointment details

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `appointmentDetails` | object | no |  |  |  |
| `appointmentDetails.appointmentId` | string | no |  |  |  |
| `appointmentDetails.appointmentStatus` | string | no |  |  |  |
| `appointmentDetails.appointmentType` | string | no |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `appointmentDetails.providerName` | string | no |  |  |  |
| `appointmentDetails.referenceId` | string, nullable | no | Same value given when booking; null if none |  |  |
| `appointmentDetails.lsProviderId` | integer | no |  |  |  |
| `appointmentDetails.appointment` | string | no | ISO 8601 date-time |  |  |
| `appointmentDetails.providerUnitFloorBuilding` | string, nullable | no |  |  |  |
| `appointmentDetails.providerAddress` | string | no |  |  |  |
| `appointmentDetails.providerLocality` | string, nullable | no |  |  |  |
| `appointmentDetails.providerCity` | string | no |  |  |  |
| `appointmentDetails.providerState` | string | no |  |  |  |
| `appointmentDetails.providerLatitude` | number | no |  |  |  |
| `appointmentDetails.providerLongitude` | number | no |  |  |  |
| `appointmentDetails.uniqueId` | string | no |  |  |  |
| `appointmentDetails.name` | string | no |  |  |  |
| `appointmentDetails.dateOfBirth` | string, nullable | no | YYYY-MM-DD |  |  |
| `appointmentDetails.age` | integer, nullable | no |  |  |  |
| `appointmentDetails.gender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `appointmentDetails.mobile` | string | no |  |  |  |
| `appointmentDetails.altContact` | string, nullable | no |  |  |  |
| `appointmentDetails.unitFloorBuilding` | string, nullable | no |  |  |  |
| `appointmentDetails.address` | string | no |  |  |  |
| `appointmentDetails.locality` | string, nullable | no |  |  |  |
| `appointmentDetails.city` | string | no |  |  |  |
| `appointmentDetails.state` | string | no |  |  |  |
| `appointmentDetails.pincode` | string | no |  |  |  |
| `appointmentDetails.customerArrivalTime` | string, nullable | no | UTC; may be null |  |  |
| `appointmentDetails.providerArrivalTime` | string, nullable | no | UTC; may be null |  |  |
| `appointmentDetails.consultStartTime` | string, nullable | no | UTC; may be null |  |  |
| `appointmentDetails.consultEndTime` | string, nullable | no | When the consultation ended, UTC. Set as soon as the provider ends the consultation; otherwise filled in after the scheduled end, once the meeting can no longer be joined. Null until then. |  |  |
| `appointmentDetails.checkInUrl` | string, nullable | no | The patient's clinic check-in link while the appointment is open; null when the visit is not offered check-in |  |  |
| `appointmentDetails.documents` | array<object> | no |  |  |  |
| `appointmentDetails.documents[].type` | string | no | PRESCRIPTION is the prescription the provider issued; PRIOR_PRESCRIPTION is one the patient already had | enum: `PRESCRIPTION`, `PRIOR_PRESCRIPTION`, `REFERRAL`, `OTHER` |  |
| `appointmentDetails.documents[].mime` | string | no |  |  |  |
| `appointmentDetails.documents[].link` | string | no | Download link |  |  |
| `appointmentDetails.prescription` | object, nullable | no | Null until the prescription is filled in |  |  |
| `appointmentDetails.prescription.chiefComplaints` | string | no |  |  |  |
| `appointmentDetails.prescription.doctorNotes` | string | no |  |  |  |
| `appointmentDetails.prescription.followUpAdvice` | string | no |  |  |  |
| `appointmentDetails.prescription.labTests` | array<object> | no |  |  |  |
| `appointmentDetails.prescription.labTests[].testId` | string | no |  |  |  |
| `appointmentDetails.prescription.labTests[].type` | string | no |  | enum: `TEST`, `PACKAGE` |  |
| `appointmentDetails.prescription.labTests[].name` | string | no |  |  |  |
| `appointmentDetails.prescription.labTests[].instructions` | string | no |  |  |  |
| `appointmentDetails.prescription.medication` | array<object> | no |  |  |  |
| `appointmentDetails.prescription.medication[].drugId` | integer, nullable | no | Null if custom |  |  |
| `appointmentDetails.prescription.medication[].name` | string | no |  |  |  |
| `appointmentDetails.prescription.medication[].dosage` | string | no |  |  |  |
| `appointmentDetails.prescription.medication[].frequency` | string | no |  |  |  |
| `appointmentDetails.prescription.medication[].duration` | string | no |  |  |  |
| `appointmentDetails.prescription.medication[].additionalInstructions` | string | no |  |  |  |
| `appointmentDetails.isFollowUp` | boolean | no |  |  |  |
| `appointmentDetails.previousAppointmentId` | integer, nullable | no |  |  |  |
| `appointmentDetails.followUpUntil` | string, nullable | no |  |  |  |
| `followUpDays` | integer, nullable | no | Free follow-up window (days); null if not configured | minimum: `0` |  |
| `followupUntil` | string, nullable | no | Deadline until which a follow-up is valid; null if not available |  |  |

Example:
```json
{
  "status": "success",
  "appointmentDetails": {
    "appointmentId": "434585",
    "appointmentStatus": "PENDING",
    "appointmentType": "HOME_VISIT",
    "providerName": "Dr. John Doe",
    "referenceId": "123",
    "lsProviderId": 22,
    "appointment": "2024-12-23T18:25:43.511Z",
    "providerUnitFloorBuilding": "4th Floor Building A",
    "providerAddress": "1234 Clinic Road",
    "providerLocality": null,
    "providerCity": "Bangalore",
    "providerState": "Karnataka",
    "providerLatitude": 13.045163,
    "providerLongitude": 77.56,
    "uniqueId": "CUST001",
    "name": "Bob Smith",
    "dateOfBirth": "2000-01-01",
    "age": 24,
    "gender": "MALE",
    "mobile": "8047359194",
    "altContact": "8047359194",
    "unitFloorBuilding": "2nd Floor Tower 3",
    "address": "123 Main Road",
    "locality": "Gopalapur",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560035",
    "customerArrivalTime": "2024-12-23T08:05:42.511Z",
    "providerArrivalTime": "2024-12-23T08:02:21.759Z",
    "consultStartTime": "2024-12-23T08:05:42.511Z",
    "consultEndTime": null,
    "checkInUrl": null,
    "documents": [
      {
        "type": "PRESCRIPTION",
        "mime": "application/pdf",
        "link": "https://integration.labstack.in/api/v1.0/appointment/getDocument?appointmentId=34&documentId=3"
      }
    ],
    "prescription": {
      "chiefComplaints": "stomach ache for 2 days",
      "doctorNotes": "Need follow up in 7 days",
      "followUpAdvice": "",
      "labTests": [],
      "medication": []
    },
    "isFollowUp": false,
    "previousAppointmentId": null,
    "followUpUntil": "2026-08-04T03:30:00.000Z"
  },
  "followUpDays": 7,
  "followupUntil": "2026-08-04T03:30:00.000Z"
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getAppointments

**List appointments**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Paginated list of the store's appointments with optional date and email filters. (updatedSince is accepted but currently not applied.)

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `startDate` | query | string (date) | no |  |  |  |
| `endDate` | query | string (date) | no |  |  |  |
| `updatedSince` | query | string (date-time) | no |  |  |  |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |
| `email` | query | string | no |  |  |  |

#### Responses

##### 200

Appointment list

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `appointments` | array<object> | no |  |  |  |
| `appointments[].appointmentId` | string | no |  |  |  |
| `appointments[].appointmentStatus` | string | no |  |  |  |
| `appointments[].appointmentType` | string | no |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `appointments[].referenceId` | string, nullable | no |  |  |  |
| `appointments[].lsGroupId` | integer, nullable | no |  |  |  |
| `appointments[].groupName` | string, nullable | no |  |  |  |
| `appointments[].lsProviderId` | integer | no |  |  |  |
| `appointments[].providerName` | string | no |  |  |  |
| `appointments[].appointmentDate` | string | no | ISO 8601 date-time |  |  |
| `appointments[].speciality` | string, nullable | no |  |  |  |
| `appointments[].subSpeciality` | string, nullable | no |  |  |  |
| `appointments[].isFollowUp` | boolean | no |  |  |  |
| `appointments[].previousAppointmentId` | integer, nullable | no |  |  |  |
| `appointments[].followUpUntil` | string, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "appointments": [
    {
      "appointmentId": "47585",
      "appointmentStatus": "CREATED",
      "appointmentType": "CENTER_VISIT",
      "referenceId": "213",
      "lsGroupId": 1,
      "groupName": "Top Doctors",
      "lsProviderId": 12,
      "providerName": "Dr. John Doe",
      "appointmentDate": "2023-12-23T18:25:43.511Z",
      "speciality": "blood",
      "subSpeciality": null,
      "isFollowUp": false,
      "previousAppointmentId": null,
      "followUpUntil": null
    },
    {
      "appointmentId": "434585",
      "appointmentStatus": "PENDING",
      "appointmentType": "HOME_VISIT",
      "referenceId": null,
      "lsGroupId": null,
      "groupName": null,
      "lsProviderId": 22,
      "providerName": "Dr. Jane Smith",
      "appointmentDate": "2024-12-23T18:25:43.511Z",
      "speciality": null,
      "subSpeciality": null,
      "isFollowUp": true,
      "previousAppointmentId": 42537,
      "followUpUntil": null
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getAuthenticatedMeetingLink

**Get authenticated meeting link**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns a token-appended teleconsultation link for an ONLINE appointment, valid within the allowed time window.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes |  |  | 789 |
| `participantType` | query | string | no |  | enum: `MAIN_PARTICIPANT`, `ADDITIONAL_PARTICIPANT`, `PROVIDER`; default: `"MAIN_PARTICIPANT"` |  |

#### Responses

##### 200

Authenticated meeting link

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `meetingLink` | string | no |  |  |  |
| `participantType` | string | no |  |  |  |
| `participantName` | string | no |  |  |  |
| `appointmentDate` | string (date-time) | no |  |  |  |
| `windowStart` | string (date-time) | no | When the link starts working. |  |  |
| `windowEnd` | string (date-time) | no | When the link stops working. Later if the provider has extended the consultation. |  |  |

Example:
```json
{
  "status": "success",
  "meetingLink": "https://console.labstack.in/meetings/a3602e8c-bd6d-40ed-ba41-260f14e9d498?token=2b98fc36-50b2-4caf-aaa8-5bddab6c378f",
  "participantType": "MAIN_PARTICIPANT",
  "participantName": "Bob Smith",
  "appointmentDate": "2025-06-01T11:00:00.000Z",
  "windowStart": "2025-06-01T10:50:00.000Z",
  "windowEnd": "2025-06-01T12:00:00.000Z"
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getDocument

**Download an appointment document**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Streams the raw document file (ownership-checked).

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `documentId` | query | string | yes |  |  |  |

#### Responses

##### 200

The document file

Content type: `application/octet-stream`

Schema: string (binary)

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getEscalationDetails

**Get appointment escalation details**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the full record of one escalation raised on one of the store's appointments: the complaint, its description and notes, current status and severity, the patient, provider and appointment it concerns, and links to any attached images.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `escalationId` | query | integer | yes |  |  | 532 |

#### Responses

##### 200

Escalation details

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `escalationDetails` | object | no |  |  |  |
| `escalationDetails.escalationId` | integer | no |  |  |  |
| `escalationDetails.complaint` | string | no | What the escalation is about. |  |  |
| `escalationDetails.description` | string, nullable | no |  |  |  |
| `escalationDetails.notes` | string, nullable | no |  |  |  |
| `escalationDetails.entityType` | string | no | What the escalation is raised on. Always APPOINTMENT for this endpoint. | enum: `APPOINTMENT` |  |
| `escalationDetails.appointmentId` | integer | no |  |  |  |
| `escalationDetails.appointmentType` | string | no |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `escalationDetails.status` | string | no |  | enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED` |  |
| `escalationDetails.severity` | string | no |  | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |
| `escalationDetails.userName` | string, nullable | no | Name of the patient the appointment is for. |  |  |
| `escalationDetails.uniqueId` | string, nullable | no | The patient's unique id as supplied by the store. |  |  |
| `escalationDetails.providerId` | integer, nullable | no |  |  |  |
| `escalationDetails.providerName` | string, nullable | no |  |  |  |
| `escalationDetails.createdAt` | string (date-time) | no |  |  |  |
| `escalationDetails.updatedAt` | string (date-time) | no |  |  |  |
| `escalationDetails.images` | array<object> | no | Images attached to the escalation, oldest first. ISSUE images were attached when the escalation was raised; RESOLUTION images were added while resolving it. Fetch each one from its link with the same ls-api-key header. |  |  |
| `escalationDetails.images[].type` | string | no |  | enum: `ISSUE`, `RESOLUTION` |  |
| `escalationDetails.images[].id` | integer | no |  |  |  |
| `escalationDetails.images[].link` | string | no | URL of getEscalationImage for this image. |  |  |

Example:
```json
{
  "status": "success",
  "escalationDetails": {
    "escalationId": 532,
    "complaint": "Provider did not join the call",
    "description": "The doctor was a no-show for the scheduled online consult.",
    "notes": "Customer waited 15 minutes before leaving.",
    "entityType": "APPOINTMENT",
    "appointmentId": 789,
    "appointmentType": "ONLINE",
    "status": "PENDING",
    "severity": "HIGH",
    "userName": "Priya Sharma",
    "uniqueId": "CUST-10442",
    "providerId": 45,
    "providerName": "Dr. Arjun Mehta",
    "createdAt": "2026-10-14T06:30:10.000Z",
    "updatedAt": "2026-10-14T06:30:10.000Z",
    "images": [
      {
        "type": "ISSUE",
        "id": 1204,
        "link": "https://integration.labstack.in/api/v1.0/appointment/getEscalationImage?appointmentId=789&type=ISSUE&imageId=1204"
      },
      {
        "type": "RESOLUTION",
        "id": 1219,
        "link": "https://integration.labstack.in/api/v1.0/appointment/getEscalationImage?appointmentId=789&type=RESOLUTION&imageId=1219"
      }
    ]
  }
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 404

No escalation with this id exists on the store's appointments

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getEscalationImage

**Download an escalation image**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns one image attached to an escalation on the store's appointment. ISSUE images were attached when the escalation was raised; RESOLUTION images were added while resolving it. Use the ready-made links in the images array of getEscalationDetails rather than building this URL yourself.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | integer | yes | Appointment the escalation was raised on. |  | 789 |
| `type` | query | string | no | Optional check on the kind of image requested. When given, the image must be of this kind, otherwise the request fails with 400. | enum: `ISSUE`, `RESOLUTION` |  |
| `imageId` | query | integer | yes | Identifies the image. Taken from the images array of the escalation details. |  | 1204 |

#### Responses

##### 200

The image file, with its own content type (for example image/jpeg or image/png).

Content type: `image/*`

Schema: string (binary)

##### 400 (`BadRequest`)

type was given and the image is not of that type

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 404

No image with this id exists on an escalation for this appointment

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getEscalations

**List appointment escalations**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Paginated list of escalations raised on the store's appointments, newest first. Returns the basic fields only; use getEscalationDetails for the full record of one escalation.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | query | string | no | Only return escalations in this status. | enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED` |  |
| `appointmentId` | query | integer | no | Only return escalations raised on this appointment. |  | 789 |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  | default: `1` |  |

#### Responses

##### 200

Escalation list

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `escalations` | array<object> | no |  |  |  |
| `escalations[].escalationId` | integer | no |  |  |  |
| `escalations[].complaint` | string | no |  |  |  |
| `escalations[].appointmentId` | integer | no |  |  |  |
| `escalations[].status` | string | no |  | enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED` |  |
| `escalations[].severity` | string | no |  | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |
| `escalations[].createdAt` | string (date-time) | no |  |  |  |
| `escalations[].updatedAt` | string (date-time) | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "escalations": [
    {
      "escalationId": 533,
      "complaint": "Prescription not shared after consult",
      "appointmentId": 812,
      "status": "IN_PROGRESS",
      "severity": "MEDIUM",
      "createdAt": "2026-10-15T09:12:44.000Z",
      "updatedAt": "2026-10-15T11:40:02.000Z"
    },
    {
      "escalationId": 532,
      "complaint": "Provider did not join the call",
      "appointmentId": 789,
      "status": "PENDING",
      "severity": "HIGH",
      "createdAt": "2026-10-14T06:30:10.000Z",
      "updatedAt": "2026-10-14T06:30:10.000Z"
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/getPrescriptionPdf

**Download prescription PDF**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Renders and streams the appointment's prescription as a PDF.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes |  |  |  |

#### Responses

##### 200

Prescription PDF

Content type: `application/pdf`

Schema: string (binary)

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 404

Prescription not available

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/appointment/rescheduleAppointment

**Reschedule an appointment**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Reschedules an appointment (or updates the requested time of a not-yet-assigned provider-group request) and refreshes the online meeting link. This GET has side effects.
An appointment can be rescheduled up to a fixed notice period before its scheduled time -- 30 minutes by default. Inside that period, and for an appointment the patient did not attend, rescheduling is refused and the caller is directed to support. Three cases are not held to the notice period: a completed online appointment, which is how a follow-up is booked; an on-demand consult; and an appointment whose provider never joined. An online appointment whose consultation has already taken place but which is not yet completed - it is awaiting the provider's prescription or diet chart - cannot be rescheduled; once it is completed, rescheduling it books the follow-up.
If your account is set up to run its own appointment operations, appointments of the types you manage are not held to the notice period at all. You can move one at any time, to any time -- including a time that has already passed -- and an appointment you cancelled can be moved back into an active slot. A completed appointment remains closed. Ask your account manager to enable this and to choose which appointment types it covers.
A reschedule can occasionally fail temporarily. The appointment then keeps its current time, and repeating the call is safe.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes |  |  |  |
| `appointmentTime` | query | string (date-time) | yes | The new appointment time. Must be in the future, unless your account runs its own appointment operations for this appointment type. |  | "2025-06-01T11:00:00+05:30" |

#### Responses

##### 200

Appointment rescheduled

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `appointment` | object | no |  |  |  |
| `appointment.appointmentId` | integer | no |  |  |  |
| `appointment.appointmentTime` | string (date-time), nullable | no |  |  |  |
| `appointment.appointmentStatus` | string | no |  |  |  |
| `appointment.followUpDays` | integer, nullable | no | Free follow-up window (days) starting from the new appointment time; null if not configured or this appointment is itself a follow-up | minimum: `0` |  |
| `appointment.followUpUntil` | string, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "appointment": {
    "appointmentId": 789,
    "appointmentTime": "2025-06-02T11:00:00+05:30",
    "appointmentStatus": "RESCHEDULED",
    "followUpDays": null,
    "followUpUntil": null
  }
}
```

##### 400 (`BadRequest`)

The appointment can no longer be changed, or the new time is not acceptable. Returned when the scheduled time is less than the notice period away, when the patient did not attend, when its online consultation has already taken place and it is not yet completed, when the appointment is already cancelled or completed, or when the new time has already passed. The notice period, the cancelled state and the past-time rule do not apply to an account running its own appointment operations for that appointment type. Also returned when no slot starts at the new time, and, with "This appointment can no longer be rescheduled. Contact support.", for an appointment that cannot be moved for another reason.


Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### POST /api/v1.0/appointment/submitFeedback

**Submit appointment feedback**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Records your customer's feedback on one of your appointments. `feedbackType` says which survey the feedback answers, and decides the rating scale and the survey answers the body must carry. Send any survey answers as top-level fields next to `rating`; do not wrap them in an object.

| feedbackType | What it rates | rating | Survey fields | Accepted when |
| --- | --- | --- | --- | --- |
| `APPOINTMENT_COMPLETE` | The customer's experience of the appointment | Whole number from **1 to 10** | None | The appointment is `COMPLETED` |

A rating outside its type's range is rejected with 400. `comments` is optional.

An appointment holds one feedback per feedbackType: submitting the same feedbackType again for the same appointment replaces the earlier rating and comments. A low rating opens an escalation on the appointment for LabStack support to follow up.

Example `APPOINTMENT_COMPLETE` body:

```json
{
  "appointmentId": 789,
  "feedbackType": "APPOINTMENT_COMPLETE",
  "rating": 8,
  "comments": "The doctor was thorough but the call started 10 minutes late."
}
```

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `appointmentId` | integer | yes | Appointment id the feedback is about. Must be an appointment booked by your store. |  |  |
| `feedbackType` | string | yes | Which survey this feedback answers. Decides the rating range and the survey fields required; see the table above. | enum: `APPOINTMENT_COMPLETE` |  |
| `rating` | integer | yes | Whole number from 1 to 10 for APPOINTMENT_COMPLETE. |  |  |
| `comments` | string | no | Optional. What the customer said, in their words. Up to 1000 characters. |  |  |

Example:
```json
{
  "appointmentId": 789,
  "feedbackType": "APPOINTMENT_COMPLETE",
  "rating": 8,
  "comments": "The doctor was thorough but the call started 10 minutes late."
}
```

#### Responses

##### 200

Feedback recorded

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `feedback` | object | no |  |  |  |
| `feedback.appointmentId` | integer | no |  |  |  |
| `feedback.feedbackType` | string | no |  | enum: `APPOINTMENT_COMPLETE` |  |
| `feedback.rating` | integer | no |  |  |  |
| `feedback.maxRating` | integer | no | Highest rating on this feedbackType's scale: 10 for APPOINTMENT_COMPLETE. |  |  |
| `feedback.comments` | string, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "feedback": {
    "appointmentId": 789,
    "feedbackType": "APPOINTMENT_COMPLETE",
    "rating": 8,
    "maxRating": 10,
    "comments": "The doctor was thorough but the call started 10 minutes late."
  }
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 404

Appointment not found for this store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Appointment 789 not found"
}
```

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 500

Feedback could not be saved

---

### GET /api/v1.0/appointment/testWebhook

**Trigger a test appointment webhook**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Sends one appointment webhook for an existing appointment to your Appointments Webhook URL, so you can test the endpoint that receives it. The appointment itself is not changed. If your store has no Appointments Webhook URL, nothing is sent and the call still answers success.

The webhook carries the appointment as it is now. Pass `appointmentStatus` to see the payload at another stage of the appointment, and `event` to choose what goes in `events`:

- `documents` is empty for every status except COMPLETED and CANCELED. COMPLETED adds a sample PRESCRIPTION document when the appointment has none; its link is a placeholder and does not download.
- `event` defaults to STATUS_CHANGED. Use CREATED to reproduce the webhook sent when an appointment is booked.

The payload is described under Webhook below. Webhooks sent for real changes to your appointments have the same shape.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `appointmentId` | query | string | yes | Id of the appointment to send a webhook for. The appointment is not changed. |  | "434585" |
| `appointmentStatus` | query | string | no | Optional. Appointment status to put in the webhook instead of the appointment's current status. | enum: `PENDING`, `CREATED`, `CONFIRMED`, `RESCHEDULED`, `DELAYED`, `CHECKED_IN`, `CANCELED`, `COMPLETED`, `PATIENT_NO_SHOW`, `PROVIDER_NO_SHOW` |  |
| `event` | query | string | no | Optional. The event to put in `events`. Defaults to STATUS_CHANGED. | enum: `CREATED`, `STATUS_CHANGED`, `DOC_CHANGED`, `DATE_CHANGED`, `MEETING_EVENT` |  |

#### Responses

##### 200

Webhook triggered

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `message` | string | no |  |  | "Webhook successfully triggered" |

Example:
```json
{
  "status": "success",
  "message": "Webhook successfully triggered"
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 404

No appointment with this id belongs to your store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

#### Callback / webhook: `appointmentWebhook`

Target: `POST <your Appointments Webhook URL>`

**Appointment webhook, sent to your Appointments Webhook URL when one of your appointments is booked or changes**

Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Sent as a POST with a JSON body. Answer with any 2xx status; the response body is ignored.

Every webhook carries your store's webhook authentication header, a header name and value agreed with LabStack: check it to confirm the webhook came from LabStack. Contact us to set or change it. Its value does not change when your API keys are rotated or revoked.

`events` lists everything that changed in the update, so one webhook can carry several events:

| Event | Sent when |
| --- | --- |
| `CREATED` | The appointment was booked. Sent once, and never together with another event. |
| `STATUS_CHANGED` | `appointmentStatus` changed. |
| `DATE_CHANGED` | `appointmentDate` changed, for example when the appointment is rescheduled. |
| `DOC_CHANGED` | A document was added to, replaced in or removed from `documents`. |
| `MEETING_EVENT` | One of `customerArrivalTime`, `providerArrivalTime`, `consultStartTime` or `consultEndTime` was set or changed. |

###### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | header | string | no | The webhook authentication header most stores receive, holding the webhook key agreed with LabStack for your store. If your store's authentication header has another name, that header is sent instead; if none is set up, webhooks carry no authentication header. |  |  |

###### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `events` | array<string> | no | What changed in this update. See the table above. | items: enum: `CREATED`, `STATUS_CHANGED`, `DOC_CHANGED`, `DATE_CHANGED`, `MEETING_EVENT` |  |
| `appointmentId` | integer | no | Appointment id, as returned by bookAppointment. |  |  |
| `appointmentType` | string | no |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `appointmentStatus` | string | no |  | enum: `PENDING`, `CREATED`, `CONFIRMED`, `RESCHEDULED`, `DELAYED`, `CHECKED_IN`, `CANCELED`, `COMPLETED`, `PATIENT_NO_SHOW`, `PROVIDER_NO_SHOW` |  |
| `appointmentDate` | string (date-time), nullable | no | Scheduled start, ISO 8601 in UTC; null while the appointment has no time. |  |  |
| `referenceId` | string, nullable | no | The referenceId you gave when booking; null if none. |  |  |
| `lsProviderId` | integer, nullable | no | Null until a provider is assigned. The same holds for every provider field below. |  |  |
| `providerName` | string, nullable | no |  |  |  |
| `providerGender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `providerUnitFloorBuilding` | string, nullable | no |  |  |  |
| `providerAddress` | string, nullable | no |  |  |  |
| `providerLocality` | string, nullable | no |  |  |  |
| `providerCity` | string, nullable | no |  |  |  |
| `providerState` | string, nullable | no |  |  |  |
| `providerPincode` | string, nullable | no |  |  |  |
| `providerLatitude` | number, nullable | no |  |  |  |
| `providerLongitude` | number, nullable | no |  |  |  |
| `uniqueId` | string, nullable | no | Your id for the patient. |  |  |
| `name` | string | no | Patient name. |  |  |
| `email` | string, nullable | no |  |  |  |
| `mobile` | string, nullable | no |  |  |  |
| `altNumber` | string, nullable | no |  |  |  |
| `gender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `unitFloorBuilding` | string, nullable | no |  |  |  |
| `address` | string, nullable | no |  |  |  |
| `locality` | string, nullable | no |  |  |  |
| `city` | string, nullable | no |  |  |  |
| `state` | string, nullable | no |  |  |  |
| `pincode` | string, nullable | no |  |  |  |
| `latitude` | number, nullable | no |  |  |  |
| `longitude` | number, nullable | no |  |  |  |
| `dateOfBirth` | string, nullable | no | YYYY-MM-DD; null when not known. |  |  |
| `age` | integer, nullable | no | Age in years; null when the date of birth is not known. |  |  |
| `cancelReason` | string | no | Reason given when the appointment was canceled; empty otherwise. |  |  |
| `customerArrivalTime` | string (date-time), nullable | no | When the patient arrived, or joined the call for an ONLINE appointment. ISO 8601 in UTC; null until then. |  |  |
| `providerArrivalTime` | string (date-time), nullable | no | When the provider arrived, or joined the call for an ONLINE appointment. ISO 8601 in UTC; null until then. |  |  |
| `consultStartTime` | string (date-time), nullable | no | When the consultation started, ISO 8601 in UTC; null until then. |  |  |
| `consultEndTime` | string (date-time), nullable | no | When the consultation ended, ISO 8601 in UTC. Set as soon as the provider ends the consultation; otherwise filled in after the scheduled end, once the meeting can no longer be joined. Null until then. |  |  |
| `documents` | array<object> | no | Documents attached to the appointment. Empty when there are none. |  |  |
| `documents[].link` | string | no | Download link. Call it with your `ls-api-key` header. |  |  |
| `documents[].type` | string | no | PRESCRIPTION is the prescription the provider issued; PRIOR_PRESCRIPTION is one the patient already had. | enum: `PRESCRIPTION`, `PRIOR_PRESCRIPTION`, `REFERRAL`, `OTHER` |  |
| `documents[].mime` | string | no | File type, such as application/pdf. |  |  |

Example:
```json
{
  "events": [
    "STATUS_CHANGED",
    "DOC_CHANGED"
  ],
  "appointmentId": 434585,
  "appointmentType": "CENTER_VISIT",
  "appointmentStatus": "COMPLETED",
  "appointmentDate": "2026-10-06T04:30:00.000Z",
  "referenceId": "123",
  "lsProviderId": 22,
  "providerName": "Dr. John Doe",
  "providerGender": "MALE",
  "providerUnitFloorBuilding": "4th Floor Building A",
  "providerAddress": "1234 Clinic Road",
  "providerLocality": "Indiranagar",
  "providerCity": "Bangalore",
  "providerState": "Karnataka",
  "providerPincode": "560038",
  "providerLatitude": 12.9784,
  "providerLongitude": 77.6408,
  "uniqueId": "CUST001",
  "name": "Asha Rao",
  "email": "asha.rao@example.com",
  "mobile": "8047359194",
  "altNumber": null,
  "gender": "FEMALE",
  "unitFloorBuilding": "2nd Floor Tower 3",
  "address": "123 Main Road",
  "locality": "Gopalapur",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560035",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "dateOfBirth": "1990-04-12",
  "age": 36,
  "cancelReason": "",
  "customerArrivalTime": "2026-10-06T04:22:10.000Z",
  "providerArrivalTime": "2026-10-06T04:15:42.000Z",
  "consultStartTime": "2026-10-06T04:31:05.000Z",
  "consultEndTime": "2026-10-06T04:48:30.000Z",
  "documents": [
    {
      "link": "https://console.labstack.in/api/v1.0/appointment/getDocument?documentId=3",
      "type": "PRESCRIPTION",
      "mime": "application/pdf"
    }
  ]
}
```

###### Responses

####### 200

Any 2xx status acknowledges the webhook. The response body is ignored.

---

### POST /api/v1.0/appointment/uploadDocument

**Upload appointment documents**

Tag: Appointment · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Uploads 1-5 base64-encoded documents (pdf/jpg/jpeg/png, max 10 MB each) to an appointment. `PRESCRIPTION` is reserved for the prescription the provider issues and is rejected with 400 — use `PRIOR_PRESCRIPTION` for a prescription the patient already had.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `appointmentId` | integer | yes |  |  |  |
| `documents` | array<object> | yes |  |  |  |
| `documents[].content` | string | yes | base64-encoded file |  |  |
| `documents[].fileName` | string | yes |  |  | "report.pdf" |
| `documents[].docType` | string | yes | PRIOR_PRESCRIPTION for a prescription the patient already had, REFERRAL for a referral letter, OTHER for anything else. PRESCRIPTION is provider-only and returns 400. | enum: `PRIOR_PRESCRIPTION`, `REFERRAL`, `OTHER` |  |

Example:
```json
{
  "appointmentId": 789,
  "documents": [
    {
      "content": "JVBERi0xLjQK...",
      "fileName": "prior-prescription.pdf",
      "docType": "PRIOR_PRESCRIPTION"
    }
  ]
}
```

#### Responses

##### 200

Documents uploaded

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `appointmentId` | integer | no |  |  |  |
| `uploadedCount` | integer | no |  |  |  |
| `documents` | array<object> | no |  |  |  |
| `documents[].documentId` | integer | no |  |  |  |
| `documents[].docType` | string | no |  |  |  |
| `errors` | array<string> | no | present only on partial failure |  |  |

Example:
```json
{
  "status": "success",
  "appointmentId": 789,
  "uploadedCount": 2,
  "documents": [
    {
      "documentId": 456,
      "docType": "PRIOR_PRESCRIPTION"
    },
    {
      "documentId": 457,
      "docType": "REFERRAL"
    }
  ]
}
```

##### 400 (`BadRequest`)

Invalid request — bad appointmentId, empty/oversized documents array, unsupported file extension or size, or an invalid docType (including PRESCRIPTION, which is provider-only).

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

## Availability

### GET /api/v1.0/availability/getAppointmentSlots

**Get appointment slots**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Generates bookable slots per provider and provider group for a date, with distance filtering for CENTER_VISIT. Provide pincode OR latitude+longitude for non-ONLINE appointment types; provide speciality only when passing subSpeciality. For CENTER_VISIT the providers are returned nearest-first across pages.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `providerType` | query | string | yes |  |  | "Doctor" |
| `appointmentType` | query | string | yes |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `date` | query | string | yes |  |  | "2025-06-01" |
| `speciality` | query | string | no |  |  |  |
| `subSpeciality` | query | string | no |  |  |  |
| `gender` | query | string | no |  | enum: `MALE`, `FEMALE` |  |
| `procedureIds` | query | string | no | Comma-separated list of procedure IDs |  |  |
| `providerIds` | query | string | no | Comma-separated list of provider IDs |  |  |
| `perPage` | query | integer | no | Results per page. Defaults to 20, which is also the maximum; a larger value is rejected with a 400. | maximum: `20`; default: `20` |  |
| `page` | query | integer | no |  |  |  |
| `latitude` | query | string | no |  |  |  |
| `longitude` | query | string | no |  |  |  |
| `pincode` | query | string | no |  |  |  |
| `address` | query | string | no |  |  |  |
| `locality` | query | string | no |  |  |  |
| `city` | query | string | no |  |  |  |
| `state` | query | string | no |  |  |  |
| `range` | query | number | no | Search radius in KM from the given location, applied to CENTER_VISIT only. Defaults to 10; values above 100 are rejected. | maximum: `100`; default: `10` |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no | Providers available on the given date that match every filter (including range and provider leave). Paging through all pages returns exactly this many entries in `slots`. |  |  |
| `page` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `slots` | array<object> | no |  |  |  |
| `slots[].type` | string | no |  |  |  |
| `slots[].specialities` | array<string> | no |  |  |  |
| `slots[].subSpecialities` | array<string> | no |  |  |  |
| `slots[].providerName` | string | no |  |  |  |
| `slots[].lsId` | integer | no |  |  |  |
| `slots[].gender` | string | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `slots[].timing` | array<object> | no |  |  |  |
| `slots[].timing[].startTime` | string | no | HH:MM (24-hour) |  |  |
| `slots[].timing[].endTime` | string | no | HH:MM (24-hour) |  |  |
| `slots[].timing[].procedureIds` | array<integer> | no |  |  |  |
| `slots[].timing[].supportedAppointmentTypes` | array<string> | no |  |  |  |
| `slots[].unitFloorBuilding` | string, nullable | no |  |  |  |
| `slots[].address` | string | no |  |  |  |
| `slots[].locality` | string, nullable | no |  |  |  |
| `slots[].city` | string | no |  |  |  |
| `slots[].state` | string | no |  |  |  |
| `slots[].pincode` | string | no |  |  |  |
| `slots[].latitude` | number | no |  |  |  |
| `slots[].longitude` | number | no |  |  |  |
| `slots[].distance` | number, nullable | no | Only for CENTER_VISIT appointment types |  |  |
| `groupSlots` | array<object> | no |  |  |  |
| `groupSlots[].lsGroupId` | integer | no |  |  |  |
| `groupSlots[].procedureId` | integer | no |  |  |  |
| `groupSlots[].type` | string | no |  |  |  |
| `groupSlots[].supportedAppointmentTypes` | array<string> | no |  |  |  |
| `groupSlots[].specialities` | array<string> | no |  |  |  |
| `groupSlots[].subSpecialities` | array<string> | no |  |  |  |
| `groupSlots[].groupName` | string | no |  |  |  |
| `groupSlots[].timing` | array<object> | no |  |  |  |
| `groupSlots[].timing[].startTime` | string | no |  |  |  |
| `groupSlots[].timing[].endTime` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "page": 1,
  "perPage": 20,
  "isLastPage": true,
  "pincode": "560035",
  "latitude": 13.045163,
  "longitude": 77.537758,
  "date": "2025-06-01",
  "slots": [
    {
      "type": "DOCTOR",
      "specialities": [],
      "subSpecialities": [],
      "providerName": "Dr. John Doe",
      "lsId": 347484,
      "gender": "MALE",
      "timing": [
        {
          "startTime": "08:15",
          "endTime": "08:45",
          "procedureIds": [
            1
          ],
          "supportedAppointmentTypes": [
            "ONLINE"
          ]
        },
        {
          "startTime": "09:15",
          "endTime": "09:45",
          "procedureIds": [
            1
          ],
          "supportedAppointmentTypes": [
            "ONLINE"
          ]
        },
        {
          "startTime": "14:00",
          "endTime": "14:30",
          "procedureIds": [
            1
          ],
          "supportedAppointmentTypes": [
            "ONLINE"
          ]
        }
      ],
      "unitFloorBuilding": "17/1",
      "address": "Happy Clinic - 2nd Cross",
      "locality": "Jaya Nagar",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560041",
      "latitude": 13.012313,
      "longitude": 76.3123189,
      "distance": 5.6
    },
    {
      "type": "DOCTOR",
      "specialities": [],
      "subSpecialities": [],
      "providerName": "Dr. Jane Smith",
      "lsId": 347485,
      "gender": "FEMALE",
      "timing": [
        {
          "startTime": "10:30",
          "endTime": "10:45",
          "procedureIds": [
            1,
            3
          ],
          "supportedAppointmentTypes": [
            "ONLINE",
            "CENTER_VISIT"
          ]
        },
        {
          "startTime": "13:00",
          "endTime": "13:30",
          "procedureIds": [
            1,
            3
          ],
          "supportedAppointmentTypes": [
            "ONLINE",
            "CENTER_VISIT"
          ]
        }
      ],
      "unitFloorBuilding": null,
      "address": "Healthy Clinic - 3rd Main Road",
      "locality": null,
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560013",
      "latitude": 12.412917,
      "longitude": 76.5143189,
      "distance": 12.3
    }
  ],
  "groupSlots": [
    {
      "lsGroupId": 47645,
      "procedureId": 2,
      "type": "PHLEBOTOMIST",
      "supportedAppointmentTypes": [
        "CENTER_VISIT"
      ],
      "specialities": [],
      "subSpecialities": [],
      "groupName": "Bangalore Phlebos",
      "timing": [
        {
          "startTime": "08:15",
          "endTime": "08:45"
        },
        {
          "startTime": "09:15",
          "endTime": "09:45"
        },
        {
          "startTime": "14:00",
          "endTime": "14:30"
        }
      ]
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getDiscounts

**List appointment discounts**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the store's appointment discounts that are live now. Each discount is limited by four whitelist/blacklist filters: provider types, specialities, procedures and providers. A WHITELIST filter applies the discount only to the listed items; a BLACKLIST filter applies it to everything except them, and an empty BLACKLIST applies it to everything. A booking qualifies only if it passes all four. For the speciality filter, a provider with several specialities qualifies unless every one of them is blacklisted. Discounts are applied by bookAppointment, which reports the discount a booking received; a discount with a COUPON_CODE condition applies only when that couponCode is sent.

#### Responses

##### 200

Live appointment discounts

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `discounts` | array<object> | no |  |  |  |
| `discounts[].discountId` | string | no |  |  |  |
| `discounts[].name` | string | no |  |  |  |
| `discounts[].description` | string, nullable | no |  |  |  |
| `discounts[].type` | string | no |  | enum: `PERCENTAGE`, `FIXED_AMOUNT` |  |
| `discounts[].percentage` | number, nullable | no |  |  |  |
| `discounts[].maxAmount` | number, nullable | no | Upper limit (INR) on a PERCENTAGE discount. |  |  |
| `discounts[].amount` | number, nullable | no | Amount (INR) off for a FIXED_AMOUNT discount. |  |  |
| `discounts[].conditions` | array<object> | no | Optional conditions: COUPON_CODE, MIN_CART_VALUE, MAX_CART_VALUE, CART_VALUE_BETWEEN. Cart values are compared with the configured cost of the procedure being booked. |  |  |
| `discounts[].validFrom` | string, nullable | no |  |  |  |
| `discounts[].validUntil` | string, nullable | no |  |  |  |
| `discounts[].maxUsageTotal` | number, nullable | no |  |  |  |
| `discounts[].maxUsagePerMobile` | number, nullable | no |  |  |  |
| `discounts[].providerTypes` | object | no |  |  |  |
| `discounts[].providerTypes.mode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].providerTypes.items` | array<object> | no |  |  |  |
| `discounts[].providerTypes.items[].id` | integer | no |  |  |  |
| `discounts[].providerTypes.items[].name` | string | no |  |  |  |
| `discounts[].specialities` | object | no |  |  |  |
| `discounts[].specialities.mode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].specialities.items` | array<object> | no |  |  |  |
| `discounts[].specialities.items[].id` | integer | no |  |  |  |
| `discounts[].specialities.items[].name` | string | no |  |  |  |
| `discounts[].procedures` | object | no | Item ids are lsProcedureId values. |  |  |
| `discounts[].procedures.mode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].procedures.items` | array<object> | no |  |  |  |
| `discounts[].procedures.items[].id` | integer | no |  |  |  |
| `discounts[].procedures.items[].name` | string | no |  |  |  |
| `discounts[].providers` | object | no | Item ids are lsProviderId values. |  |  |
| `discounts[].providers.mode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].providers.items` | array<object> | no |  |  |  |
| `discounts[].providers.items[].id` | integer | no |  |  |  |
| `discounts[].providers.items[].name` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "discounts": [
    {
      "discountId": "DISC-1727430000000-K3F9QZ",
      "name": "10% off consultations",
      "description": "For first-time patients",
      "type": "PERCENTAGE",
      "percentage": 10,
      "maxAmount": 200,
      "amount": null,
      "conditions": [
        {
          "type": "COUPON_CODE",
          "value": "CONSULT10"
        }
      ],
      "validFrom": "2026-09-01T00:00:00.000Z",
      "validUntil": null,
      "maxUsageTotal": 500,
      "maxUsagePerMobile": 1,
      "providerTypes": {
        "mode": "WHITELIST",
        "items": [
          {
            "id": 1,
            "name": "Doctor"
          }
        ]
      },
      "specialities": {
        "mode": "BLACKLIST",
        "items": [
          {
            "id": 12,
            "name": "Cardiology"
          }
        ]
      },
      "procedures": {
        "mode": "BLACKLIST",
        "items": []
      },
      "providers": {
        "mode": "BLACKLIST",
        "items": []
      }
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getProcedure

**Get procedure details**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns a procedure with the providers who offer it, the prices that apply to your store, and each provider's next available slot. Prices are specific to the API key used - where your store has its own agreed price for a provider's procedure, that is what is returned, and other stores may see different values for the same provider.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `procedureId` | query | integer | yes |  |  | 15 |
| `providerIds` | query | string | no | Comma-separated list of provider IDs |  |  |
| `appointmentTypes` | query | string | no | Comma-separated list of appointment types (ONLINE, CENTER_VISIT, HOME_VISIT) |  |  |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `lsProcedureId` | integer | no |  |  |  |
| `name` | string | no |  |  |  |
| `preProcedureInstructions` | string | no |  |  |  |
| `postProcedureInstructions` | string | no |  |  |  |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `providers` | array<object> | no |  |  |  |
| `providers[].lsId` | integer | no |  |  |  |
| `providers[].name` | string | no |  |  |  |
| `providers[].retailPrice` | number | no | Sale price for the procedure at your store |  |  |
| `providers[].cost` | number | no | Your store's cost for the procedure |  |  |
| `providers[].pricingModel` | string | no |  | enum: `FIXED`, `DISCOUNT` |  |
| `providers[].duration` | integer | no | Slot duration in minutes |  |  |
| `providers[].appointmentType` | string | no |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `providers[].nextAvailableSlot` | string | no | Next available slot start time (UTC). The same provider can appear multiple times with different appointment types. |  |  |

Example:
```json
{
  "status": "success",
  "lsProcedureId": 1,
  "name": "Consultation",
  "preProcedureInstructions": "",
  "postProcedureInstructions": "",
  "total": 3,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "providers": [
    {
      "lsId": 7,
      "name": "Dr. Sameer Bhatia",
      "retailPrice": 800,
      "cost": 800,
      "pricingModel": "FIXED",
      "duration": 20,
      "appointmentType": "ONLINE",
      "nextAvailableSlot": "2026-07-21T13:50:00.000Z"
    },
    {
      "lsId": 4,
      "name": "Dr. Aisha Narayanan",
      "retailPrice": 600,
      "cost": 600,
      "pricingModel": "FIXED",
      "duration": 20,
      "appointmentType": "CENTER_VISIT",
      "nextAvailableSlot": "2026-07-23T13:50:00.000Z"
    },
    {
      "lsId": 19,
      "name": "Dr. Archana K",
      "retailPrice": 500,
      "cost": 500,
      "pricingModel": "FIXED",
      "duration": 20,
      "appointmentType": "HOME_VISIT",
      "nextAvailableSlot": "2026-07-22T13:50:00.000Z"
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getProcedures

**List procedures**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Paginated list of procedures offered in the store network.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |
| `providerType` | query | string | no | Filter by provider type |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `procedures` | array<object> | no |  |  |  |
| `procedures[].lsProcedureId` | integer | no |  |  |  |
| `procedures[].name` | string | no |  |  |  |
| `procedures[].preProcedureInstructions` | string | no |  |  |  |
| `procedures[].postProcedureInstructions` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "procedures": [
    {
      "lsProcedureId": 1,
      "name": "Consultation",
      "preProcedureInstructions": "",
      "postProcedureInstructions": ""
    },
    {
      "lsProcedureId": 2,
      "name": "Injection",
      "preProcedureInstructions": "Do not consume alcohol 12 hours prior",
      "postProcedureInstructions": "Do not irritate the injected area"
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getProviderTagCategories

**List provider tag categories**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists provider-tag categories in the store network with per-category tag counts.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `categories` | array<object> | no |  |  |  |
| `categories[].categoryId` | integer | no |  |  |  |
| `categories[].categoryName` | string | no |  |  |  |
| `categories[].tagCount` | integer | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Symptom",
      "tagCount": 2
    },
    {
      "categoryId": 2,
      "categoryName": "Organ",
      "tagCount": 2
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getProviderTags

**List provider tags**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists provider tags with provider counts; optional categoryId filter.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |
| `categoryId` | query | integer | no |  |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `tags` | array<object> | no |  |  |  |
| `tags[].tagId` | integer | no |  |  |  |
| `tags[].tagName` | string | no |  |  |  |
| `tags[].categoryId` | integer | no |  |  |  |
| `tags[].categoryName` | string | no |  |  |  |
| `tags[].providerCount` | integer | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 4,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "tags": [
    {
      "tagId": 2,
      "tagName": "Cough",
      "categoryId": 1,
      "categoryName": "Symptom",
      "providerCount": 33
    },
    {
      "tagId": 1,
      "tagName": "Fever",
      "categoryId": 1,
      "categoryName": "Symptom",
      "providerCount": 42
    },
    {
      "tagId": 3,
      "tagName": "Head",
      "categoryId": 2,
      "categoryName": "Organ",
      "providerCount": 1
    },
    {
      "tagId": 4,
      "tagName": "Heart",
      "categoryId": 2,
      "categoryName": "Organ",
      "providerCount": 1
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getProviders

**Search providers**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Searches network providers and provider groups with filtering; optional userUniqueId adds recent-appointment / follow-up data. Provide pincode OR latitude+longitude for non-ONLINE; provide speciality only with subSpeciality.

Pass scope=instantConsultGroup on its own to list the doctors who take your instant consults instead of searching. That form ignores every other parameter here, and is refused with 400 when instant consult is not set up for your account.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `scope` | query | string | no | Set to instantConsultGroup to list the doctors who take your instant consults. Every other parameter is then ignored, including providerType and appointmentType, which are otherwise required. | enum: `instantConsultGroup` |  |
| `providerType` | query | string | yes |  |  | "Doctor" |
| `appointmentType` | query | string | yes |  | enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `speciality` | query | string | no |  |  |  |
| `subSpeciality` | query | string | no |  |  |  |
| `tags` | query | string | no | Comma-separated list of tag names |  |  |
| `procedureIds` | query | string | no | Comma-separated list of procedure IDs |  |  |
| `providerIds` | query | string | no | Comma-separated list of provider IDs (the `lsId` of each provider). Restricts the search to these providers; provider groups are likewise reduced to their matching providers. |  | "347484,346484" |
| `tagIds` | query | string | no | Comma-separated list of tag IDs |  |  |
| `categoryIds` | query | string | no | Comma-separated list of tag category IDs |  |  |
| `gender` | query | string | no |  | enum: `MALE`, `FEMALE` |  |
| `latitude` | query | string | no |  |  |  |
| `longitude` | query | string | no |  |  |  |
| `pincode` | query | string | no |  |  |  |
| `address` | query | string | no |  |  |  |
| `locality` | query | string | no |  |  |  |
| `city` | query | string | no |  |  |  |
| `state` | query | string | no |  |  |  |
| `range` | query | number | no | Search radius in KM from the given location, applied to CENTER_VISIT only. Defaults to 10; values above 100 are rejected. | maximum: `100`; default: `10` |  |
| `userUniqueId` | query | string | no |  |  |  |
| `perPage` | query | integer | no | Results per page. Defaults to 200, which is also the maximum; a larger value is rejected with a 400. | maximum: `200`; default: `200` |  |
| `page` | query | integer | no |  |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `total` | integer | no |  |  |  |
| `perPage` | integer | no |  |  |  |
| `page` | integer | no |  |  |  |
| `isLastPage` | boolean | no |  |  |  |
| `latitude` | number, nullable | no |  |  |  |
| `longitude` | number, nullable | no |  |  |  |
| `providers` | array<object> | no |  |  |  |
| `providers[].lsId` | integer | no |  |  |  |
| `providers[].type` | string | no | Provider type (see appendix) |  |  |
| `providers[].specialities` | array<string> | no |  |  |  |
| `providers[].subSpecialities` | array<string> | no |  |  |  |
| `providers[].tags` | array<object> | no |  |  |  |
| `providers[].tags[].category` | string | no |  |  |  |
| `providers[].tags[].name` | string | no |  |  |  |
| `providers[].supportedAppointmentTypes` | array<string> | no |  | items: enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `providers[].languagesKnown` | array<string> | no |  |  |  |
| `providers[].name` | string | no |  |  |  |
| `providers[].gender` | string | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `providers[].yearsExperience` | integer, nullable | no |  |  |  |
| `providers[].hasRecentAppointment` | boolean | no | Only present when userUniqueId is supplied |  |  |
| `providers[].followUpDays` | integer, nullable | no | Days of free follow-up offered after the appointment; null if not configured | minimum: `0` |  |
| `providers[].followUpUntil` | string, nullable | no | Only present when userUniqueId is supplied |  |  |
| `providers[].recentAppointments` | array<object> | no | Only present when userUniqueId is supplied |  |  |
| `providers[].recentAppointments[].appointmentId` | integer | no |  |  |  |
| `providers[].recentAppointments[].appointmentDate` | string | no |  |  |  |
| `providers[].recentAppointments[].appointmentType` | string | no |  |  |  |
| `providers[].recentAppointments[].appointmentStatus` | string | no |  |  |  |
| `providers[].profileUrl` | string, nullable | no |  |  |  |
| `providers[].rating` | number | no |  |  |  |
| `providers[].totalRatings` | integer | no |  |  |  |
| `providers[].unitFloorBuilding` | string, nullable | no |  |  |  |
| `providers[].address` | string | no |  |  |  |
| `providers[].locality` | string, nullable | no |  |  |  |
| `providers[].city` | string | no |  |  |  |
| `providers[].state` | string | no |  |  |  |
| `providers[].pincode` | string | no |  |  |  |
| `providers[].latitude` | number | no |  |  |  |
| `providers[].longitude` | number | no |  |  |  |
| `providers[].distance` | number, nullable | no | Null if not a CENTER_VISIT appointment type |  |  |
| `providerGroups` | array<object> | no | Provider groups servicing the location. specialities/subSpecialities/tags are the union across all providers in the group. |  |  |
| `providerGroups[].type` | string | no |  |  |  |
| `providerGroups[].supportedAppointmentTypes` | array<string> | no |  |  |  |
| `providerGroups[].specialities` | array<string> | no |  |  |  |
| `providerGroups[].subSpecialities` | array<string> | no |  |  |  |
| `providerGroups[].tags` | array<object> | no |  |  |  |
| `providerGroups[].groupName` | string | no |  |  |  |
| `providerGroups[].lsGroupId` | integer | no |  |  |  |

Example:
```json
{
  "status": "success",
  "total": 2,
  "perPage": 200,
  "page": 1,
  "isLastPage": true,
  "latitude": 13.045163,
  "longitude": 77.537758,
  "providers": [
    {
      "lsId": 347484,
      "type": "DOCTOR",
      "specialities": [
        "General Physician"
      ],
      "subSpecialities": [],
      "tags": [
        {
          "category": "Symptom",
          "name": "Bleeding"
        },
        {
          "category": "Organ",
          "name": "Heart"
        }
      ],
      "supportedAppointmentTypes": [
        "ONLINE"
      ],
      "languagesKnown": [
        "English",
        "Hindi"
      ],
      "name": "Dr. John Doe",
      "gender": "MALE",
      "yearsExperience": 3,
      "hasRecentAppointment": true,
      "followUpDays": 14,
      "followUpUntil": "2025-06-15T05:30:00.000Z",
      "recentAppointments": [
        {
          "appointmentId": 10478,
          "appointmentDate": "2026-02-18T13:00:00.000Z",
          "appointmentType": "HOME_VISIT",
          "appointmentStatus": "CREATED"
        }
      ],
      "profileUrl": null,
      "rating": 4.3,
      "totalRatings": 28,
      "unitFloorBuilding": "Tower 3, floor 5",
      "address": "Main Street, 3rd Cross",
      "locality": "District Square",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560013",
      "latitude": 13.045163,
      "longitude": 77.537758,
      "distance": null
    },
    {
      "lsId": 346484,
      "type": "DENTIST",
      "specialities": [],
      "subSpecialities": [],
      "tags": [
        {
          "category": "Symptom",
          "name": "Toothache"
        }
      ],
      "supportedAppointmentTypes": [
        "CENTER_VISIT"
      ],
      "languagesKnown": [
        "Hindi",
        "Kannada"
      ],
      "name": "Dr. Jane Smith",
      "gender": "FEMALE",
      "yearsExperience": null,
      "hasRecentAppointment": false,
      "followUpDays": 7,
      "followUpUntil": null,
      "recentAppointments": [],
      "profileUrl": "https://clinic.example/profile.png",
      "rating": 4.9,
      "totalRatings": 291,
      "unitFloorBuilding": null,
      "address": "4th Cross Rd, Centerway",
      "locality": null,
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560010",
      "latitude": 12.971599,
      "longitude": 77.594566,
      "distance": 4
    }
  ],
  "providerGroups": [
    {
      "type": "PHLEBOTOMIST",
      "supportedAppointmentTypes": [
        "CENTER_VISIT"
      ],
      "specialities": [],
      "subSpecialities": [],
      "tags": [],
      "groupName": "Bangalore Phlebos",
      "lsGroupId": 47645
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/availability/getSpecialities

**List specialities**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists specialities (with sub-specialities and merged tags) for a provider type.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `providerType` | query | string | yes |  |  | "Doctor" |
| `tags` | query | string | no | Comma-separated list of tag names |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `specialities` | array<object> | no |  |  |  |
| `specialities[].name` | string | no |  |  |  |
| `specialities[].providerCount` | integer | no | Number of providers of this provider type mapped to the store for this speciality |  |  |
| `specialities[].subSpecialities` | array<string> | no |  |  |  |
| `specialities[].tags` | array<object> | no |  |  |  |
| `specialities[].tags[].name` | string | no |  |  |  |
| `specialities[].tags[].category` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "specialities": [
    {
      "name": "Blood",
      "providerCount": 3,
      "subSpecialities": [
        "Transfusion",
        "Bone Marrow"
      ],
      "tags": [
        {
          "category": "Symptom",
          "name": "Bleeding"
        },
        {
          "category": "Symptom",
          "name": "Coughing Blood"
        },
        {
          "category": "Organ",
          "name": "Heart"
        }
      ]
    },
    {
      "name": "Neurology",
      "providerCount": 1,
      "subSpecialities": [
        "Epilepsy",
        "Behavioral Neurology",
        "Headache"
      ],
      "tags": []
    },
    {
      "name": "Muscular",
      "providerCount": 2,
      "subSpecialities": [],
      "tags": [
        {
          "category": "Organ",
          "name": "Brain"
        }
      ]
    }
  ]
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

## Consult

### POST /api/v1.0/consult/cancelInstant

**Cancel an instant consult request**

Tag: Consult · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Withdraws a request that is still waiting for a doctor, so it stops being offered. Use this when the patient gives up before a doctor accepts. Only a request still waiting can be withdrawn: once a doctor has accepted, or the request has expired or already been cancelled, the call is refused with 400 and the request is left as it is. A request created by another account is refused with 403.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `requestId` | integer | yes | The requestId returned by createInstant. |  |  |

Example:
```json
{
  "requestId": 4821
}
```

#### Responses

##### 200

Request withdrawn

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  |  |
| `requestId` | integer | no |  |  |  |

Example:
```json
{
  "status": "CANCELED",
  "requestId": 4821
}
```

##### 400 (`BadRequest`)

Missing or invalid requestId, or the request can no longer be withdrawn

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Missing or invalid ls-api-key

Shared response: Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 403

The request belongs to another account

##### 404

No such request

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### POST /api/v1.0/consult/createAdditionalParticipant

**Add an observer to a consult**

Tag: Consult · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Mints an extra meeting link for a consult a doctor has already accepted, so one of your own staff can join alongside the patient and the doctor. Each call returns a new, separate link, so request one per person joining and do not share a link between them. The consult must already have been accepted: a request still waiting for a doctor, expired or cancelled is refused with 400. A request created by another account is refused with 403.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `requestId` | integer | yes | The requestId returned by createInstant. |  |  |
| `participantName` | string | no | Shown to the others in the consult. Defaults to Observer. | maxLength: `50` |  |

Example:
```json
{
  "requestId": 4821,
  "participantName": "Care Desk"
}
```

#### Responses

##### 201

Observer link created

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  |  |
| `requestId` | integer | no |  |  |  |
| `meetingLink` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "requestId": 4821,
  "meetingLink": "https://consult.labstack.in/meetings/0f8c2a1e?token=7a1c93be5d"
}
```

##### 400 (`BadRequest`)

Missing or invalid requestId, or the consult has not been accepted yet

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Missing or invalid ls-api-key

Shared response: Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 403

The request belongs to another account

##### 404

No such request

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### POST /api/v1.0/consult/createInstant

**Request an instant consult for a patient**

Tag: Consult · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates an instant consult request and offers it to the doctors available to your account. The response carries the `requestId` to poll with GET /api/v1.0/consult/getInstantStatus, and `expiresAt` — the moment the request stops being offered if no doctor has accepted it by then. Treat `expiresAt` as the deadline rather than assuming a fixed window. If the same patient already has a request still waiting for a doctor, that request is returned unchanged, with its original `requestId` and `expiresAt`, instead of a second one being started. The patient is identified by `uniqueId`; when you omit it, it is derived from the mobile number and name, and calling again with the same `uniqueId` updates that patient rather than creating another. Instant consult must be enabled for your account, and a call from an account without it is refused with 403; if it is enabled but no doctors are currently set up to take these, the call is refused with 409 rather than creating a request nobody would answer.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `name` | string | yes |  | maxLength: `50` |  |
| `mobile` | string | yes | Ten digits, not starting with 0. |  |  |
| `gender` | string | no | Optional. Ignored if the patient already has a gender on record; change a recorded one with POST /api/admin/v1.0/user/updateUserDetails. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `age` | integer | no | Optional. Whole years, used when dateOfBirth is not given. |  |  |
| `dateOfBirth` | string (date) | no | Optional. Cannot be in the future. Takes precedence over age. Ignored, like age, if the patient already has a date of birth on record; change a recorded one with POST /api/admin/v1.0/user/updateUserDetails. |  |  |
| `uniqueId` | string | no | Your own key for this patient. Derived from mobile and name when omitted. |  |  |
| `specialityId` | integer | no | The speciality the patient needs. The request is offered first to the doctors who hold it, and to the rest of your doctors shortly after, so naming one reaches the right doctor sooner without risking the request going unanswered. Omit it to reach everyone straight away. |  |  |
| `providerTypeId` | integer | no | Recorded on the request and returned with it. It does not change which doctors the request reaches. |  |  |
| `notes` | string | no | Why the patient is calling, shown to the doctor who accepts. | maxLength: `1000` |  |
| `clinicalContext` | object | no | Optional snapshot shown to the doctor who accepts. Only the five keys below are kept, each trimmed to 500 characters; any other key is ignored. |  |  |
| `clinicalContext.chiefComplaint` | string | no |  |  |  |
| `clinicalContext.allergies` | string | no |  |  |  |
| `clinicalContext.medications` | string | no |  |  |  |
| `clinicalContext.bloodGroup` | string | no |  |  |  |
| `clinicalContext.briefHistory` | string | no |  |  |  |

Example:
```json
{
  "name": "Asha Menon",
  "mobile": "9876543210",
  "gender": "FEMALE",
  "age": 34,
  "uniqueId": "PT-100294",
  "specialityId": 12,
  "notes": "Fever and sore throat since yesterday.",
  "clinicalContext": {
    "chiefComplaint": "Fever 101F, sore throat",
    "allergies": "Penicillin",
    "medications": "Paracetamol 500mg as needed",
    "bloodGroup": "O+",
    "briefHistory": "No chronic conditions."
  }
}
```

#### Responses

##### 201

Request created and being offered to doctors

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no | BROADCASTING while the request is waiting for a doctor to accept. |  |  |
| `requestId` | integer | no |  |  |  |
| `expiresAt` | string (date-time) | no |  |  |  |

Example:
```json
{
  "status": "BROADCASTING",
  "requestId": 4821,
  "expiresAt": "2026-09-27T10:32:00.000Z"
}
```

##### 400 (`BadRequest`)

A required field is missing or invalid

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Missing or invalid ls-api-key

Shared response: Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 403

Instant consult is not enabled for this account

##### 409

No doctors are currently set up to take instant consults for this account

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

### GET /api/v1.0/consult/getInstantStatus

**Check an instant consult request**

Tag: Consult · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Reports where an instant consult request has got to. Poll this after POST /api/v1.0/consult/createInstant until `status` leaves BROADCASTING. `status` is BROADCASTING while the request is still being offered, CLAIMED once a doctor has accepted it, EXPIRED once `expiresAt` has passed with no doctor having accepted, and CANCELED if you cancelled it. EXPIRED is reported as soon as the deadline has passed, whether or not you polled before it. Once a doctor has accepted, `appointmentId` and `meetingLink` are filled in; `meetingLink` is the patient's own link and can be opened directly, so send the patient straight to it. Both are null until then. A request created by another account is refused with 403.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `requestId` | query | string | yes | The requestId returned by createInstant. |  | 4821 |

#### Responses

##### 200

Current state of the request

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `BROADCASTING`, `CLAIMED`, `EXPIRED`, `CANCELED` |  |
| `requestId` | integer | no |  |  |  |
| `expiresAt` | string (date-time) | no |  |  |  |
| `appointmentId` | integer, nullable | no |  |  |  |
| `meetingLink` | string, nullable | no |  |  |  |

Example:
```json
{
  "status": "CLAIMED",
  "requestId": 4821,
  "expiresAt": "2026-09-27T10:32:00.000Z",
  "appointmentId": 91245,
  "meetingLink": "https://consult.labstack.in/meetings/0f8c2a1e?token=0b9d41f6c2"
}
```

##### 400 (`BadRequest`)

Missing or invalid requestId

Shared response: Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Missing or invalid ls-api-key

Shared response: Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 403

The request belongs to another account

##### 404

No such request

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

## Network

### GET /api/v1.0/network/getProviderDetails

**Get provider details**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns a single provider profile (specialities, sub-specialities, tags, follow-up days) plus a computed next available slot (30-day forward search).

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `lsProviderId` | query | integer | yes |  |  | 42 |
| `procedureId` | query | integer | no |  |  |  |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `provider` | object, nullable | no | Present when lsProviderId was given |  |  |
| `provider.type` | string | no |  |  |  |
| `provider.specialities` | array<string> | no |  |  |  |
| `provider.subspecialities` | array<string> | no |  |  |  |
| `provider.tags` | array<object> | no |  |  |  |
| `provider.tags[].category` | string | no |  |  |  |
| `provider.tags[].name` | string | no |  |  |  |
| `provider.supportedAppointmentTypes` | array<string> | no |  | items: enum: `ONLINE`, `CENTER_VISIT`, `HOME_VISIT` |  |
| `provider.providerName` | string | no |  |  |  |
| `provider.gender` | string | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `provider.lsId` | integer | no |  |  |  |
| `provider.unitFloorBuilding` | string, nullable | no |  |  |  |
| `provider.address` | string | no |  |  |  |
| `provider.locality` | string, nullable | no |  |  |  |
| `provider.city` | string | no |  |  |  |
| `provider.state` | string | no |  |  |  |
| `provider.pincode` | string | no |  |  |  |
| `provider.latitude` | number | no |  |  |  |
| `provider.longitude` | number | no |  |  |  |
| `providerGroup` | object, nullable | no | Present when lsGroupId was given instead |  |  |
| `providerGroup.type` | string | no |  |  |  |
| `providerGroup.supportedAppointmentTypes` | array<string> | no |  |  |  |
| `providerGroup.specialities` | array<string> | no |  |  |  |
| `providerGroup.subspecialities` | array<string> | no |  |  |  |
| `providerGroup.groupName` | string | no |  |  |  |
| `providerGroup.lsGroupId` | integer | no |  |  |  |
| `rating` | number, nullable | no | Average provider rating (1-5) |  |  |
| `totalRatings` | integer | no | Total number of ratings received |  |  |
| `followUpDays` | integer, nullable | no | Free follow-up window (days); null if not configured for this speciality | minimum: `0` |  |
| `followupUntil` | string, nullable | no | Deadline until which a follow-up is valid; null if not available |  |  |

Example:
```json
{
  "status": "success",
  "provider": {
    "type": "DOCTOR",
    "specialities": [],
    "subspecialities": [],
    "tags": [
      {
        "category": "Symptom",
        "name": "Bleeding"
      },
      {
        "category": "Organ",
        "name": "Heart"
      }
    ],
    "supportedAppointmentTypes": [
      "ONLINE",
      "CENTER_VISIT"
    ],
    "providerName": "Dr. John Doe",
    "gender": "MALE",
    "lsId": 347484,
    "unitFloorBuilding": "Tower 3, floor 5",
    "address": "Main Street, 3rd Cross",
    "locality": "District Square",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560013",
    "latitude": 13.045163,
    "longitude": 77.537758
  },
  "providerGroup": null,
  "rating": 4.3,
  "totalRatings": 28,
  "followUpDays": 14,
  "followupUntil": "2025-06-15T05:30:00.000Z"
}
```

##### 400 (`BadRequest`)

Bad request — missing or invalid parameters

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 429 (`TooManyRequests`)

Too many failed authentication attempts from your address. Every request from that address is refused, whatever key it carries, until the number of seconds in the Retry-After header has passed.

Response headers:

| Header | Type | Description | Example |
| --- | --- | --- | --- |
| `Retry-After` | integer | Seconds to wait before retrying. | 540 |

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

---

