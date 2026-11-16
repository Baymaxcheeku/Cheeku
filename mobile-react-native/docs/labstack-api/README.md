# LabStack API reference (Labs, Pharma, Provider)

Offline copy of the public LabStack integration docs, pulled on 2026-11-16 from `integration.labstack.in/api-docs/*`. Each docs page is a Next.js app that ships its full OpenAPI 3.0.0 spec inside the page payload, so the specs here are the real source, not a scrape of the rendered text.

| API | Spec version | Endpoints | Reference | Raw spec | Docs page |
| --- | --- | --- | --- | --- | --- |
| Labs | 1.3.57 | 34 | [labs.md](labs.md) | [raw/labs.openapi.json](raw/labs.openapi.json) | https://integration.labstack.in/api-docs/labs |
| Pharma | 1.2.0 | 9 | [pharma.md](pharma.md) | [raw/pharma.openapi.json](raw/pharma.openapi.json) | https://integration.labstack.in/api-docs/pharma |
| Provider (consultations) | 1.0.28 | 32 | [provider.md](provider.md) | [raw/provider.openapi.json](raw/provider.openapi.json) | https://integration.labstack.in/api-docs/provider |
| Admin (extra, see note) | 1.0.0 | 1 | [admin.md](admin.md) | [raw/admin.openapi.json](raw/admin.openapi.json) | https://integration.labstack.in/api-docs/admin |

## Base URLs

Every spec lists exactly one server: `https://integration.labstack.in`. No separate production host is published anywhere in the docs. The marketing page (labstack.in/solutions/api-solutions) talks about moving "from sandbox to production", and some endpoints say they work only in "the UAT environment" (for example Labs `POST /api/v1.3/order/triggerOrderLifecycle`, which answers 403 elsewhere), but the production hostname itself is not documented. Ask LabStack for it before go-live.

## Authentication

All four APIs use the same scheme: an API key in the `ls-api-key` request header.

```
ls-api-key: <YOUR_API_KEY>
```

> API key issued by LabStack. Pass this in every request header. Your store can hold two active keys at once, so you can move to a new key before the old one is revoked. A key may have an expiry date; a request made with an expired or revoked key is refused as unauthorized.

Shared error shape on every API: `{"status": "failure", "error": "<message>"}`. Common responses: `400 BadRequest` (missing or invalid parameters), `401 Unauthorized` (key missing, invalid, expired or revoked), `429 TooManyRequests` (too many failed authentication attempts from your address; wait for the seconds in `Retry-After`). That 429 is the only rate limiting the docs describe; no per-key request quota is published.

Webhooks: Labs sends order webhooks to your Diagnostics Webhook URL (verified with a store-specific header agreed with LabStack), Provider sends appointment webhooks plus instant-consult webhooks signed with `x-labstack-signature` (HMAC-SHA256 of the raw body), and Pharma POSTs every order change to your pharmacy webhook URL (the "Order Status Webhook", described in Pharma `getOrderDetails` and `placeOrder`). Full details are in each API file under the `testWebhook` endpoints and the Provider overview.

## Endpoint index

### Labs

| API | Method | Path | Purpose |
| --- | --- | --- | --- |
| Labs | GET | [`/api/v1.3/admin/getBalance`](labs.md#get-apiv13admingetbalance) | Get wallet balance |
| Labs | GET | [`/api/v1.3/admin/status`](labs.md#get-apiv13adminstatus) | Service health check |
| Labs | GET | [`/api/v1.3/availability/checkServiceability`](labs.md#get-apiv13availabilitycheckserviceability) | Check serviceability |
| Labs | GET | [`/api/v1.3/availability/getSlots`](labs.md#get-apiv13availabilitygetslots) | Get lab slots |
| Labs | GET | [`/api/v1.3/camp/getCampDetails`](labs.md#get-apiv13campgetcampdetails) | Get camp details |
| Labs | GET | [`/api/v1.3/camp/getCampSlots`](labs.md#get-apiv13campgetcampslots) | Get camp slots |
| Labs | GET | [`/api/v1.3/camp/getCamps`](labs.md#get-apiv13campgetcamps) | List camps |
| Labs | POST | [`/api/v1.3/camp/placeCampOrder`](labs.md#post-apiv13campplacecamporder) | Place a camp order |
| Labs | GET | [`/api/v1.3/network/getDiscounts`](labs.md#get-apiv13networkgetdiscounts) | List store discounts |
| Labs | GET | [`/api/v1.3/network/getLabs`](labs.md#get-apiv13networkgetlabs) | List labs |
| Labs | GET | [`/api/v1.3/network/getPackage`](labs.md#get-apiv13networkgetpackage) | Get package details |
| Labs | GET | [`/api/v1.3/network/getPackagePreparations`](labs.md#get-apiv13networkgetpackagepreparations) | Get package preparations |
| Labs | GET | [`/api/v1.3/network/getPackageTags`](labs.md#get-apiv13networkgetpackagetags) | List package tags |
| Labs | GET | [`/api/v1.3/network/getPackages`](labs.md#get-apiv13networkgetpackages) | List packages |
| Labs | GET | [`/api/v1.3/network/getSampleReport`](labs.md#get-apiv13networkgetsamplereport) | Download sample report |
| Labs | GET | [`/api/v1.3/network/getTest`](labs.md#get-apiv13networkgettest) | Get test details |
| Labs | GET | [`/api/v1.3/network/getTests`](labs.md#get-apiv13networkgettests) | List tests |
| Labs | GET | [`/api/v1.3/order/cancelOrder`](labs.md#get-apiv13ordercancelorder) | Cancel an order |
| Labs | POST | [`/api/v1.3/order/escalation`](labs.md#post-apiv13orderescalation) | Raise an order escalation |
| Labs | GET | [`/api/v1.3/order/getEscalationDetails`](labs.md#get-apiv13ordergetescalationdetails) | Get order escalation details |
| Labs | GET | [`/api/v1.3/order/getEscalationImage`](labs.md#get-apiv13ordergetescalationimage) | Download an order escalation image |
| Labs | GET | [`/api/v1.3/order/getEscalations`](labs.md#get-apiv13ordergetescalations) | List order escalations |
| Labs | GET | [`/api/v1.3/order/getOrderDetails`](labs.md#get-apiv13ordergetorderdetails) | Get order details |
| Labs | GET | [`/api/v1.3/order/getOrders`](labs.md#get-apiv13ordergetorders) | List orders |
| Labs | GET | [`/api/v1.3/order/getReport`](labs.md#get-apiv13ordergetreport) | Download order report PDF |
| Labs | GET | [`/api/v1.3/order/getReportRawValues`](labs.md#get-apiv13ordergetreportrawvalues) | Get order report values |
| Labs | POST | [`/api/v1.3/order/placeOrder`](labs.md#post-apiv13orderplaceorder) | Place a lab order |
| Labs | GET | [`/api/v1.3/order/rescheduleOrder`](labs.md#get-apiv13orderrescheduleorder) | Reschedule an order |
| Labs | POST | [`/api/v1.3/order/submitFeedback`](labs.md#post-apiv13ordersubmitfeedback) | Submit order feedback |
| Labs | GET | [`/api/v1.3/order/testWebhook`](labs.md#get-apiv13ordertestwebhook) | Trigger a test order webhook |
| Labs | POST | [`/api/v1.3/order/triggerOrderLifecycle`](labs.md#post-apiv13ordertriggerorderlifecycle) | Move a test order to a status (UAT only) |
| Labs | POST | [`/api/v1.3/order/updateOrder`](labs.md#post-apiv13orderupdateorder) | Update an order |
| Labs | GET | [`/api/v1.3/request/linkToOrder`](labs.md#get-apiv13requestlinktoorder) | Link a request to an order |
| Labs | POST | [`/api/v1.3/request/placeRequest`](labs.md#post-apiv13requestplacerequest) | Place a request |

### Pharma

| API | Method | Path | Purpose |
| --- | --- | --- | --- |
| Pharma | GET | [`/api/pharma/v1.0/catalog/getAlternatives`](pharma.md#get-apipharmav10cataloggetalternatives) | Get alternatives |
| Pharma | GET | [`/api/pharma/v1.0/catalog/getDrugDetails`](pharma.md#get-apipharmav10cataloggetdrugdetails) | Get drug details |
| Pharma | GET | [`/api/pharma/v1.0/catalog/searchDrugs`](pharma.md#get-apipharmav10catalogsearchdrugs) | Search drugs |
| Pharma | POST | [`/api/pharma/v1.0/order/cancelOrder`](pharma.md#post-apipharmav10ordercancelorder) | Cancel order |
| Pharma | POST | [`/api/pharma/v1.0/order/getEstimate`](pharma.md#post-apipharmav10ordergetestimate) | Get estimate |
| Pharma | GET | [`/api/pharma/v1.0/order/getOrderDetails`](pharma.md#get-apipharmav10ordergetorderdetails) | Get order details |
| Pharma | POST | [`/api/pharma/v1.0/order/placeOrder`](pharma.md#post-apipharmav10orderplaceorder) | Place order |
| Pharma | POST | [`/api/pharma/v1.0/order/uploadPrescription`](pharma.md#post-apipharmav10orderuploadprescription) | Upload prescription |
| Pharma | GET | [`/api/pharma/v1.0/network/checkServiceability`](pharma.md#get-apipharmav10networkcheckserviceability) | Check serviceability |

### Provider (consultations)

| API | Method | Path | Purpose |
| --- | --- | --- | --- |
| Provider | GET | [`/api/v1.0/admin/getBalance`](provider.md#get-apiv10admingetbalance) | Get wallet balance |
| Provider | GET | [`/api/v1.0/admin/status`](provider.md#get-apiv10adminstatus) | Service health check |
| Provider | POST | [`/api/v1.0/appointment/bookAppointment`](provider.md#post-apiv10appointmentbookappointment) | Book an appointment |
| Provider | GET | [`/api/v1.0/appointment/cancelAppointment`](provider.md#get-apiv10appointmentcancelappointment) | Cancel an appointment |
| Provider | DELETE | [`/api/v1.0/appointment/deleteAllDocuments`](provider.md#delete-apiv10appointmentdeletealldocuments) | Delete all appointment documents (deprecated) |
| Provider | DELETE | [`/api/v1.0/appointment/deleteDocument`](provider.md#delete-apiv10appointmentdeletedocument) | Delete an appointment document (deprecated) |
| Provider | POST | [`/api/v1.0/appointment/escalation`](provider.md#post-apiv10appointmentescalation) | Raise an appointment escalation |
| Provider | GET | [`/api/v1.0/appointment/getAppointmentDetails`](provider.md#get-apiv10appointmentgetappointmentdetails) | Get appointment details |
| Provider | GET | [`/api/v1.0/appointment/getAppointments`](provider.md#get-apiv10appointmentgetappointments) | List appointments |
| Provider | GET | [`/api/v1.0/appointment/getAuthenticatedMeetingLink`](provider.md#get-apiv10appointmentgetauthenticatedmeetinglink) | Get authenticated meeting link |
| Provider | GET | [`/api/v1.0/appointment/getDocument`](provider.md#get-apiv10appointmentgetdocument) | Download an appointment document |
| Provider | GET | [`/api/v1.0/appointment/getEscalationDetails`](provider.md#get-apiv10appointmentgetescalationdetails) | Get appointment escalation details |
| Provider | GET | [`/api/v1.0/appointment/getEscalationImage`](provider.md#get-apiv10appointmentgetescalationimage) | Download an escalation image |
| Provider | GET | [`/api/v1.0/appointment/getEscalations`](provider.md#get-apiv10appointmentgetescalations) | List appointment escalations |
| Provider | GET | [`/api/v1.0/appointment/getPrescriptionPdf`](provider.md#get-apiv10appointmentgetprescriptionpdf) | Download prescription PDF |
| Provider | GET | [`/api/v1.0/appointment/rescheduleAppointment`](provider.md#get-apiv10appointmentrescheduleappointment) | Reschedule an appointment |
| Provider | POST | [`/api/v1.0/appointment/submitFeedback`](provider.md#post-apiv10appointmentsubmitfeedback) | Submit appointment feedback |
| Provider | GET | [`/api/v1.0/appointment/testWebhook`](provider.md#get-apiv10appointmenttestwebhook) | Trigger a test appointment webhook |
| Provider | POST | [`/api/v1.0/appointment/uploadDocument`](provider.md#post-apiv10appointmentuploaddocument) | Upload appointment documents |
| Provider | GET | [`/api/v1.0/availability/getAppointmentSlots`](provider.md#get-apiv10availabilitygetappointmentslots) | Get appointment slots |
| Provider | GET | [`/api/v1.0/availability/getDiscounts`](provider.md#get-apiv10availabilitygetdiscounts) | List appointment discounts |
| Provider | GET | [`/api/v1.0/availability/getProcedure`](provider.md#get-apiv10availabilitygetprocedure) | Get procedure details |
| Provider | GET | [`/api/v1.0/availability/getProcedures`](provider.md#get-apiv10availabilitygetprocedures) | List procedures |
| Provider | GET | [`/api/v1.0/availability/getProviderTagCategories`](provider.md#get-apiv10availabilitygetprovidertagcategories) | List provider tag categories |
| Provider | GET | [`/api/v1.0/availability/getProviderTags`](provider.md#get-apiv10availabilitygetprovidertags) | List provider tags |
| Provider | GET | [`/api/v1.0/availability/getProviders`](provider.md#get-apiv10availabilitygetproviders) | Search providers |
| Provider | GET | [`/api/v1.0/availability/getSpecialities`](provider.md#get-apiv10availabilitygetspecialities) | List specialities |
| Provider | POST | [`/api/v1.0/consult/cancelInstant`](provider.md#post-apiv10consultcancelinstant) | Cancel an instant consult request |
| Provider | POST | [`/api/v1.0/consult/createAdditionalParticipant`](provider.md#post-apiv10consultcreateadditionalparticipant) | Add an observer to a consult |
| Provider | POST | [`/api/v1.0/consult/createInstant`](provider.md#post-apiv10consultcreateinstant) | Request an instant consult for a patient |
| Provider | GET | [`/api/v1.0/consult/getInstantStatus`](provider.md#get-apiv10consultgetinstantstatus) | Check an instant consult request |
| Provider | GET | [`/api/v1.0/network/getProviderDetails`](provider.md#get-apiv10networkgetproviderdetails) | Get provider details |

### Admin (extra, see note)

| API | Method | Path | Purpose |
| --- | --- | --- | --- |
| Admin | POST | [`/api/admin/v1.0/user/updateUserDetails`](admin.md#post-apiadminv10userupdateuserdetails) | Update a user's gender and date of birth |

## How these files were made

1. `curl` fetched each docs page (copies in `raw/html/`, byte for byte).
2. The OpenAPI object was pulled out of the page's React Server Components payload (`self.__next_f.push(...)`). Long descriptions are stored in that payload as separate text rows and referenced as `"$12"`, `"$13"` and so on; those references were swapped back for their text. Nothing else was changed. The JSON in `raw/*.openapi.json` is that object, pretty-printed.
3. `labs.md`, `pharma.md`, `provider.md` and `admin.md` were generated from the specs by script. Every description, enum value, constraint and example is carried over word for word. Status lifecycles, webhook payloads and error cases live in the endpoint descriptions and response tables, so look there (for example Labs `testWebhook` and `triggerOrderLifecycle`, Provider `getInstantStatus` and `testWebhook`, Pharma `getOrderDetails`).
4. A Playwright render of each page confirmed that it loads no other spec or data file: the only network calls were the page itself, fonts, `/api/auth/session` and the docs index. The rendered page holds the same content as the spec.

## Gaps and notes

- **No standalone spec file is published.** Paths like `/openapi.json`, `/api-docs/labs.json` and `/api-docs/labs/openapi.json` all return 404, so "raw as downloaded" here means the HTML pages in `raw/html/`; the `.openapi.json` files are extracted from them as described above.
- **Production base URL is not documented** (see Base URLs).
- **"About 90 pages per API" does not match what is published.** Each API is a single page with one section per endpoint: 34 for Labs, 9 for Pharma, 32 for Provider. The sidebar links are in-page anchors, and the docs index (`/api-docs`) links to only four products: admin, labs, pharma, provider. Nothing else was found to follow.
- **labstack.in pages hold no API detail.** `labstack.in/resources/api-documentation` renders only the site header and footer (text saved in `raw/rendered-text/`), and `labstack.in/solutions/api-solutions` is marketing copy (mentions OAuth 2.0, SDKs and widgets, none of which appear in the actual API specs, which use only the `ls-api-key` header).
- **Admin API was not in the original list** but is linked from the same docs index and is used by the Provider docs (`POST /api/admin/v1.0/user/updateUserDetails` to change a patient's gender or date of birth), so it is included as `admin.md`.
- No authenticated endpoint was called and no real key is stored. Example values (ids, phone numbers, meeting links) are LabStack's own sample data from the spec.
- Status values: there is no single shared status-lifecycle page. The status enums and their meanings are inside each endpoint's description and field tables.
