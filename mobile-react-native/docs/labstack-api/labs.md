# Labs API (LabStack) v1.3.57

Source: https://integration.labstack.in/api-docs/labs (OpenAPI 3.0.0 spec embedded in the page). Raw spec: [`raw/labs.openapi.json`](raw/labs.openapi.json). Generated from that file without editing any wording; descriptions are copied verbatim.

## Overview

API for integrating lab diagnostics — availability checks, package catalog, requests (enquiries), order management, report retrieval, and health camps. Every call must include a valid `ls-api-key` header.

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

- [GET /api/v1.3/admin/getBalance](#get-apiv13admingetbalance): Get wallet balance
- [GET /api/v1.3/admin/status](#get-apiv13adminstatus): Service health check
- [GET /api/v1.3/availability/checkServiceability](#get-apiv13availabilitycheckserviceability): Check serviceability
- [GET /api/v1.3/availability/getSlots](#get-apiv13availabilitygetslots): Get lab slots
- [GET /api/v1.3/camp/getCampDetails](#get-apiv13campgetcampdetails): Get camp details
- [GET /api/v1.3/camp/getCampSlots](#get-apiv13campgetcampslots): Get camp slots
- [GET /api/v1.3/camp/getCamps](#get-apiv13campgetcamps): List camps
- [POST /api/v1.3/camp/placeCampOrder](#post-apiv13campplacecamporder): Place a camp order
- [GET /api/v1.3/network/getDiscounts](#get-apiv13networkgetdiscounts): List store discounts
- [GET /api/v1.3/network/getLabs](#get-apiv13networkgetlabs): List labs
- [GET /api/v1.3/network/getPackage](#get-apiv13networkgetpackage): Get package details
- [GET /api/v1.3/network/getPackagePreparations](#get-apiv13networkgetpackagepreparations): Get package preparations
- [GET /api/v1.3/network/getPackageTags](#get-apiv13networkgetpackagetags): List package tags
- [GET /api/v1.3/network/getPackages](#get-apiv13networkgetpackages): List packages
- [GET /api/v1.3/network/getSampleReport](#get-apiv13networkgetsamplereport): Download sample report
- [GET /api/v1.3/network/getTest](#get-apiv13networkgettest): Get test details
- [GET /api/v1.3/network/getTests](#get-apiv13networkgettests): List tests
- [GET /api/v1.3/order/cancelOrder](#get-apiv13ordercancelorder): Cancel an order
- [POST /api/v1.3/order/escalation](#post-apiv13orderescalation): Raise an order escalation
- [GET /api/v1.3/order/getEscalationDetails](#get-apiv13ordergetescalationdetails): Get order escalation details
- [GET /api/v1.3/order/getEscalationImage](#get-apiv13ordergetescalationimage): Download an order escalation image
- [GET /api/v1.3/order/getEscalations](#get-apiv13ordergetescalations): List order escalations
- [GET /api/v1.3/order/getOrderDetails](#get-apiv13ordergetorderdetails): Get order details
- [GET /api/v1.3/order/getOrders](#get-apiv13ordergetorders): List orders
- [GET /api/v1.3/order/getReport](#get-apiv13ordergetreport): Download order report PDF
- [GET /api/v1.3/order/getReportRawValues](#get-apiv13ordergetreportrawvalues): Get order report values
- [POST /api/v1.3/order/placeOrder](#post-apiv13orderplaceorder): Place a lab order
- [GET /api/v1.3/order/rescheduleOrder](#get-apiv13orderrescheduleorder): Reschedule an order
- [POST /api/v1.3/order/submitFeedback](#post-apiv13ordersubmitfeedback): Submit order feedback
- [GET /api/v1.3/order/testWebhook](#get-apiv13ordertestwebhook): Trigger a test order webhook
- [POST /api/v1.3/order/triggerOrderLifecycle](#post-apiv13ordertriggerorderlifecycle): Move a test order to a status (UAT only)
- [POST /api/v1.3/order/updateOrder](#post-apiv13orderupdateorder): Update an order
- [GET /api/v1.3/request/linkToOrder](#get-apiv13requestlinktoorder): Link a request to an order
- [POST /api/v1.3/request/placeRequest](#post-apiv13requestplacerequest): Place a request

## Admin

### GET /api/v1.3/admin/getBalance

**Get wallet balance**

Tag: Admin · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the store's LabStack wallet balance (currently a stub returning 0).

#### Responses

##### 200

Wallet balance

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `walletBalance` | integer | no | The store wallet balance |  | 0 |

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

### GET /api/v1.3/admin/status

**Service health check**

Tag: Admin · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Verifies database connectivity.

#### Responses

##### 200

Service healthy

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `healthy` | boolean | no | Whether all systems are active and working as expected |  | true |

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

## Availability

### GET /api/v1.3/availability/checkServiceability

**Check serviceability**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Finds store-network labs that service a location (home-sample and center-visit). Provide pincode OR latitude+longitude. Pass service to only return labs that offer that service at the location.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `pincode` | query | string | no | Optional. The pincode to check for service availability. Required if no latitude/longitude given. 6 digits exactly. |  | "560035" |
| `latitude` | query | string | no | Optional. Latitude to check for service availability. Required if no pincode given. -90 <= latitude <= 90. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Longitude to check for service availability. Required if no pincode given. -180 <= longitude <= 180. |  | "77.537758" |
| `unitFloorBuilding` | query | string | no | Optional. Ignored if latitude and longitude are present. Will not be used to fetch lat/long. Pincode must be present to be used. |  |  |
| `address` | query | string | no | Optional. Part of the patient address. Used with pincode to derive latitude/longitude when none is given, and improves the accuracy of the serviceability result. |  |  |
| `locality` | query | string | no | Optional. Part of the patient address. Used with pincode to derive latitude/longitude when none is given, and improves the accuracy of the serviceability result. |  |  |
| `city` | query | string | no | Optional. Part of the patient address. Used with pincode to derive latitude/longitude when none is given, and improves the accuracy of the serviceability result. |  |  |
| `state` | query | string | no | Optional. Part of the patient address. Used with pincode to derive latitude/longitude when none is given, and improves the accuracy of the serviceability result. |  |  |
| `service` | query | string | no | Optional. Only return labs that offer this service at the location. Each returned lab still lists every service it offers there in type, so type always contains the requested service and may contain others. | enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `testIds` | query | string | no | Optional. Only check serviceability for labs that offer the given tests. Comma-separated LS test ids. |  | "LSL110001,LSL120031" |
| `packageIds` | query | string | no | Optional. Only check serviceability for labs that offer the given packages. Comma-separated LS package ids. |  | "LSP11002,LSP11004" |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `message` | string | no | Success detail (e.g. "8 labs found") or reason for failure |  |  |
| `pincode` | string, nullable | no | The pincode being serviced |  |  |
| `latitude` | number | no | The latitude being serviced |  |  |
| `longitude` | number | no | The longitude being serviced |  |  |
| `labs` | array<object> | no |  |  |  |
| `labs[].type` | array<string> | no |  | items: enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `labs[].labName` | string | no |  |  |  |
| `labs[].lsLabId` | number | no |  |  |  |
| `labs[].lsChainId` | number, nullable | no | Null if the lab is not part of a chain |  |  |

Example:
```json
{
  "status": "success",
  "message": "2 labs found",
  "pincode": "560035",
  "latitude": 13.045163,
  "longitude": 77.537758,
  "labs": [
    {
      "type": [
        "HOME_SAMPLE",
        "CENTER_VISIT"
      ],
      "labName": "Lab name 1",
      "lsLabId": 347484,
      "lsChainId": 1
    },
    {
      "type": [
        "CENTER_VISIT"
      ],
      "labName": "Lab name 2",
      "lsLabId": 46575,
      "lsChainId": null
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

### GET /api/v1.3/availability/getSlots

**Get lab slots**

Tag: Availability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns available appointment slots per lab for a date. Provide pincode OR latitude+longitude.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `date` | query | string | yes | Date to fetch slots for, in YYYY-MM-DD format. Must not be before today in India Standard Time (IST). |  | "2026-08-01" |
| `pincode` | query | string | no | Optional. The pincode to check for availability. Required if no latitude/longitude given. 6 digits exactly. |  | "560035" |
| `latitude` | query | string | no | Optional. Required if no pincode given. -90 <= latitude <= 90. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Required if no pincode given. -180 <= longitude <= 180. |  | "77.537758" |
| `service` | query | string | no | Optional. Filter for slots by labs of a particular order type. | enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `range` | query | string | no | Optional. Range in KM of labs to fetch center-visit slots for. Defaults to 10 Km (max 100 Km). |  |  |
| `labId` | query | string | no | Optional. Single lab id to fetch slots for. |  |  |
| `labIds` | query | string | no | Optional. Comma-separated list of lab ids to fetch slots for (only included if they meet the other filters). |  |  |
| `testIds` | query | string | no | Optional. For center-visit slots, the comma-separated LS test ids that will be selected. |  | "LSL110001" |
| `packageIds` | query | string | no | Optional. For center-visit slots, the comma-separated LS package ids that will be selected. |  | "LSP11002" |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `message` | string | no | Number of labs and slots found |  |  |
| `pincode` | string, nullable | no | The pincode being serviced |  |  |
| `latitude` | number | no | The latitude being serviced |  |  |
| `longitude` | number | no | The longitude being serviced |  |  |
| `date` | string | no | Date being checked (YYYY-MM-DD) |  |  |
| `slots` | array<object> | no |  |  |  |
| `slots[].labName` | string | no |  |  |  |
| `slots[].labLogo` | string, nullable | no |  |  |  |
| `slots[].lsLabId` | number | no |  |  |  |
| `slots[].lsChainId` | number, nullable | no |  |  |  |
| `slots[].service` | string | no |  | enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `slots[].timing` | array<string> | no | Available slot times in HH:MM (24-hour) |  |  |
| `slots[].distance` | number, nullable | no | Distance in KM. Only for center-visit labs; absent/null for home-sample labs. |  |  |

Example:
```json
{
  "status": "success",
  "message": "2 labs and 8 slots found",
  "pincode": "560035",
  "latitude": 13.045163,
  "longitude": 77.537758,
  "date": "2026-08-01",
  "slots": [
    {
      "labName": "Lab name 1",
      "labLogo": "www.image.com",
      "lsLabId": 347484,
      "lsChainId": 4,
      "service": "HOME_SAMPLE",
      "timing": [
        "08:15",
        "09:15",
        "09:45",
        "14:00"
      ]
    },
    {
      "labName": "Lab name 2",
      "labLogo": null,
      "lsLabId": 347485,
      "lsChainId": null,
      "service": "CENTER_VISIT",
      "timing": [
        "10:15",
        "11:30",
        "12:45",
        "15:00"
      ],
      "distance": 83.01323
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

## Camp

### GET /api/v1.3/camp/getCampDetails

**Get camp details**

Tag: Camp · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns full detail for one health camp (corporate, dates, phlebos, coordinators, lab, orders).

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `campLsId` | query | string | yes | LS id of the camp to fetch details for. |  | "CMP10024" |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `campDetails` | object | no |  |  |  |
| `campDetails.campLsId` | string | no |  |  |  |
| `campDetails.corporateName` | string | no |  |  |  |
| `campDetails.dates` | array<string> | no |  |  |  |
| `campDetails.orders` | array<number> | no | Order ids associated with the camp |  |  |
| `campDetails.address` | string | no |  |  |  |
| `campDetails.locality` | string, nullable | no |  |  |  |
| `campDetails.city` | string | no |  |  |  |
| `campDetails.state` | string | no |  |  |  |
| `campDetails.pincode` | string | no |  |  |  |
| `campDetails.phlebos` | array<object> | no |  |  |  |
| `campDetails.phlebos[].name` | string | no |  |  |  |
| `campDetails.phlebos[].mobile` | string | no |  |  |  |
| `campDetails.phlebos[].altMobile` | string, nullable | no |  |  |  |
| `campDetails.phlebos[].email` | string, nullable | no |  |  |  |
| `campDetails.labCoordinators` | array<object> | no |  |  |  |
| `campDetails.labCoordinators[].name` | string | no |  |  |  |
| `campDetails.labCoordinators[].mobile` | string | no |  |  |  |
| `campDetails.labCoordinators[].altMobile` | string, nullable | no |  |  |  |
| `campDetails.labCoordinators[].email` | string, nullable | no |  |  |  |
| `campDetails.labEscalators` | array<object> | no |  |  |  |
| `campDetails.labEscalators[].name` | string | no |  |  |  |
| `campDetails.labEscalators[].mobile` | string | no |  |  |  |
| `campDetails.labEscalators[].altMobile` | string, nullable | no |  |  |  |
| `campDetails.labEscalators[].email` | string, nullable | no |  |  |  |
| `campDetails.labName` | string | no |  |  |  |
| `campDetails.labLogo` | string, nullable | no |  |  |  |
| `campDetails.lsLabId` | number | no |  |  |  |
| `campDetails.lsChainId` | number, nullable | no |  |  |  |
| `campDetails.notes` | string, nullable | no |  |  |  |
| `campDetails.campStatus` | string | no |  | enum: `ONGOING`, `COMPLETED`, `REPORTS_DELIVERED`, `CANCELLED` |  |

Example:
```json
{
  "status": "success",
  "campDetails": {
    "campLsId": "CMP10024",
    "corporateName": "XYZ 123",
    "dates": [
      "2025-01-24",
      "2025-01-25"
    ],
    "orders": [
      1003,
      1004,
      1005,
      1006,
      1007,
      1008,
      1009,
      1010
    ],
    "address": "123 Main Road",
    "locality": null,
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560013",
    "phlebos": [
      {
        "name": "Bob Smith",
        "mobile": "8047359194",
        "altMobile": null,
        "email": null
      }
    ],
    "labCoordinators": [
      {
        "name": "Bob Smith",
        "mobile": "8047359194",
        "altMobile": null,
        "email": "bobsmith@example.com"
      }
    ],
    "labEscalators": [
      {
        "name": "Bob Smith",
        "mobile": "8047359194",
        "altMobile": null,
        "email": "bobsmith@example.com"
      }
    ],
    "labName": "Orange Health - Bangalore",
    "labLogo": null,
    "lsLabId": 4,
    "lsChainId": 2,
    "notes": "Went well",
    "campStatus": "REPORTS_DELIVERED"
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

### GET /api/v1.3/camp/getCampSlots

**Get camp slots**

Tag: Camp · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns generated slot availability per camp date.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `campLsId` | query | string | yes | LS id of the camp to fetch slots for. |  | "CMP10024" |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `slotsByDate` | array<object> | no | Available slots per camp date. Dates/times with no availability are filtered out. |  |  |
| `slotsByDate[].date` | string | no | YYYY-MM-DD |  |  |
| `slotsByDate[].slots` | array<object> | no |  |  |  |
| `slotsByDate[].slots[].time` | string | no | HH:MM (24-hour) |  |  |
| `slotsByDate[].slots[].available` | number | no |  |  |  |
| `slotsByDate[].slots[].capacity` | number | no |  |  |  |

Example:
```json
{
  "status": "success",
  "slotsByDate": [
    {
      "date": "2025-09-29",
      "slots": [
        {
          "time": "06:00",
          "available": 3,
          "capacity": 5
        },
        {
          "time": "06:15",
          "available": 4,
          "capacity": 5
        },
        {
          "time": "06:30",
          "available": 5,
          "capacity": 5
        }
      ]
    },
    {
      "date": "2025-09-30",
      "slots": [
        {
          "time": "06:00",
          "available": 4,
          "capacity": 5
        },
        {
          "time": "06:15",
          "available": 5,
          "capacity": 5
        },
        {
          "time": "06:45",
          "available": 5,
          "capacity": 5
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

### GET /api/v1.3/camp/getCamps

**List camps**

Tag: Camp · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists the store's camps, optionally filtered by date range.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `startDate` | query | string | no | Optional. Filter camps conducted on or after this date (YYYY-MM-DD). |  | "2025-02-01" |
| `endDate` | query | string | no | Optional. Filter camps conducted on or before this date (YYYY-MM-DD). |  | "2025-03-31" |

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `camps` | array<object> | no |  |  |  |
| `camps[].campLsId` | string | no |  |  |  |
| `camps[].corporateName` | string | no |  |  |  |
| `camps[].dates` | array<string> | no | Camp dates (YYYY-MM-DD) |  |  |
| `camps[].numOrders` | number | no |  |  |  |
| `camps[].labName` | string | no |  |  |  |
| `camps[].labLogo` | string, nullable | no |  |  |  |
| `camps[].lsLabId` | number | no |  |  |  |
| `camps[].lsChainId` | number, nullable | no |  |  |  |
| `camps[].campStatus` | string | no |  | enum: `ONGOING`, `COMPLETED`, `REPORTS_DELIVERED`, `CANCELLED` |  |

Example:
```json
{
  "status": "success",
  "camps": [
    {
      "campLsId": "CMP10031",
      "corporateName": "ABC 123",
      "dates": [
        "2025-02-14",
        "2025-02-15"
      ],
      "numOrders": 43,
      "labName": "Orange Health - Bangalore",
      "labLogo": null,
      "lsLabId": 4,
      "lsChainId": 2,
      "campStatus": "COMPLETED"
    },
    {
      "campLsId": "CMP10033",
      "corporateName": "ABC 124",
      "dates": [
        "2025-03-04",
        "2025-03-05"
      ],
      "numOrders": 27,
      "labName": "RedCliffe",
      "labLogo": null,
      "lsLabId": 2,
      "lsChainId": null,
      "campStatus": "REPORTS_DELIVERED"
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

### POST /api/v1.3/camp/placeCampOrder

**Place a camp order**

Tag: Camp · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Places an order against a health camp (validates the appointment slot against the camp's generated slots). uniqueId is optional (auto-generated when omitted). For a patient already on record (same uniqueId), a recorded gender or date of birth is kept even if this request sends different ones; only a value not yet recorded is taken from the request. Use POST /api/admin/v1.0/user/updateUserDetails to change them.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `campLsId` | string | yes | LS id of the camp to place the order in. |  |  |
| `isVip` | boolean | no | Optional. Marks the order as VIP. |  |  |
| `referenceId` | string | no | Optional. Your own reference id for the order. |  |  |
| `packageIds` | array<string> | no | LS package ids (e.g. LSP11002). Provide packageIds and/or testIds. |  |  |
| `testIds` | array<string> | no | LS test ids (e.g. LSL110001). Provide packageIds and/or testIds. |  |  |
| `appointment` | string (date-time) | yes | Appointment date-time, ISO 8601 format. Must match a generated camp slot. |  |  |
| `notes` | string | no | Optional. Free-text notes for the order. |  |  |
| `uniqueId` | string | no | Optional. Uniquely identifies the user; auto-generated ({mobile}-{name}) when omitted. |  |  |
| `name` | string | yes | Consumer name. |  |  |
| `email` | string | yes | Consumer email address. |  |  |
| `dateOfBirth` | string | no | YYYY-MM-DD. Required if age is not provided. |  |  |
| `age` | number | no | Consumer age. Required if dateOfBirth is not provided. |  |  |
| `gender` | string | yes | Consumer gender. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `mobile` | string | yes | 10 digits, cannot start with 0. |  |  |
| `altContact` | string | no | Optional. Alternate 10-digit contact number. |  |  |
| `mainUserUniqueId` | string | no | Optional. uniqueId of the main user to mark this user as a dependent. |  |  |
| `relationship` | string | no | Optional. Dependent's relationship to the main user. Defaults to OTHER. | enum: `OTHER`, `HUSBAND`, `WIFE`, `FATHER`, `MOTHER`, `SON`, `DAUGHTER`, `GRANDFATHER`, `GRANDMOTHER`, `GRANDSON`, `GRANDDAUGHTER`, `SON_IN_LAW`, `DAUGHTER_IN_LAW`, `BROTHER`, `SISTER`, `BROTHER_IN_LAW`, `SISTER_IN_LAW`, `UNCLE`, `AUNT`, `COUSIN`, `NEPHEW`, `NIECE`, `MOTHER_IN_LAW`, `FATHER_IN_LAW`, `PARTNER`, `FRIEND`, `NEIGHBOUR` |  |

Example:
```json
{
  "campLsId": "CMP100012",
  "isVip": true,
  "referenceId": "REF-123",
  "packageIds": [
    "LSP11002",
    "LSP11004"
  ],
  "testIds": [
    "LSL110001",
    "LSL120031"
  ],
  "appointment": "2025-06-01T11:00:00+05:30",
  "notes": "Patient is old, veins are thin.",
  "uniqueId": "U1234",
  "name": "Bob Smith",
  "email": "bobsmith@example.com",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "mobile": "8047359194",
  "altContact": "8047359194",
  "mainUserUniqueId": "U1233",
  "relationship": "BROTHER"
}
```

#### Responses

##### 200

Success

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `order` | object | no |  |  |  |
| `order.campLsId` | string | no |  |  |  |
| `order.orderId` | number | no |  |  |  |
| `order.preparations` | array<string> | no | Preparations to do before sample collection |  |  |
| `order.orderStatus` | string | no |  | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `PHLEBO_ASSIGNED`, `SAMPLE_COLLECTED`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_PROCESSED`, `CANCELED`, `RESCHEDULED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED` |  |
| `order.labApiError` | string, nullable | no | Error string from the lab, or null |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "campLsId": "CMP100012",
    "orderId": 47590,
    "preparations": [
      "Fasting for 12 hours"
    ],
    "orderStatus": "CREATED",
    "labApiError": null
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

## Network

### GET /api/v1.3/network/getDiscounts

**List store discounts**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the store's active lab-order discounts (incl. buy-X-get-Y offers, validity, and selection modes).

#### Responses

##### 200

Store discounts

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `discounts` | array<object> | no |  |  |  |
| `discounts[].discountId` | string | no |  |  |  |
| `discounts[].name` | string | no |  |  |  |
| `discounts[].description` | string, nullable | no |  |  |  |
| `discounts[].type` | string | no |  |  |  |
| `discounts[].percentage` | number, nullable | no |  |  |  |
| `discounts[].maxAmount` | number, nullable | no |  |  |  |
| `discounts[].amount` | number, nullable | no |  |  |  |
| `discounts[].conditions` | array<object> | no | Optional conditions of varying types (e.g. MIN_CART_VALUE, COUPON_CODE, CART_VALUE_BETWEEN). |  |  |
| `discounts[].validFrom` | string, nullable | no |  |  |  |
| `discounts[].validUntil` | string, nullable | no |  |  |  |
| `discounts[].labMode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].packageMode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].testMode` | string | no |  | enum: `WHITELIST`, `BLACKLIST` |  |
| `discounts[].selectedLabIds` | array<number> | no |  |  |  |
| `discounts[].selectedPackageLsIds` | array<string> | no |  |  |  |
| `discounts[].selectedTestLsIds` | array<string> | no |  |  |  |
| `discounts[].buyXGetY` | object, nullable | no |  |  |  |
| `discounts[].buyXGetY.rewardProducts` | array<object> | no |  |  |  |
| `discounts[].buyXGetY.rewardProducts[].lsId` | string | no |  |  |  |
| `discounts[].buyXGetY.rewardProducts[].name` | string | no |  |  |  |
| `discounts[].buyXGetY.rewardProducts[].type` | string | no |  |  |  |
| `discounts[].buyXGetY.rewardType` | string | no |  | enum: `FREE`, `DISCOUNTED` |  |
| `discounts[].buyXGetY.rewardDiscountPercentage` | number | no |  |  |  |
| `discounts[].buyXGetY.rewardQuantity` | number | no |  |  |  |
| `discounts[].maxUsageTotal` | number, nullable | no |  |  |  |
| `discounts[].maxUsagePerMobile` | number, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "discounts": [
    {
      "discountId": "DISC10001",
      "name": "Summer Sale",
      "description": "Flat 10% off on all packages",
      "type": "PERCENTAGE",
      "percentage": 10,
      "maxAmount": 500,
      "amount": null,
      "conditions": [
        {
          "type": "MIN_CART_VALUE",
          "value": 200
        },
        {
          "type": "COUPON_CODE",
          "value": "SUMMER100"
        }
      ],
      "validFrom": "2025-06-01T00:00:00.000Z",
      "validUntil": "2025-08-31T23:59:59.000Z",
      "labMode": "BLACKLIST",
      "packageMode": "WHITELIST",
      "testMode": "BLACKLIST",
      "selectedLabIds": [],
      "selectedPackageLsIds": [
        "LSP10023",
        "LSP10024"
      ],
      "selectedTestLsIds": [],
      "buyXGetY": null,
      "maxUsageTotal": 1000,
      "maxUsagePerMobile": 1
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

### GET /api/v1.3/network/getLabs

**List labs**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the labs active for your store, each with its chain and the packages it offers from your store network.
type is the kind of center. A COLLECTION_CENTER is a sample-collection point that serves home sample collection and normally takes no center visits, so it does not do scans. A DIAGNOSTIC_CENTER or HOSPITAL takes center visits; which scans and other center tests it does depends on the tests it offers. Decide which services to offer at a lab from isHomeSampleSupported and isCenterVisitSupported rather than from type, and pass testIds or packageIds to checkServiceability or getSlots to find the labs that offer all of them.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `labIds` | query | string | no | Optional. Only fetch the labs with these comma-separated lab ids. |  | "32632,56" |

#### Responses

##### 200

Store labs

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `labs` | array<object> | no |  |  |  |
| `labs[].labName` | string | no |  |  |  |
| `labs[].labLogo` | string, nullable | no |  |  |  |
| `labs[].labId` | number | no |  |  |  |
| `labs[].lsChainId` | number, nullable | no | Groups the labs of one brand. A chain id is never reused. Null if the lab is not linked to a chain. |  |  |
| `labs[].chainName` | string, nullable | no | Name of the chain. Null if the lab is not linked to a chain. |  |  |
| `labs[].chainLogo` | string, nullable | no | URL of the chain's logo, or null. |  |  |
| `labs[].type` | string | no | The kind of center. See the description above. | enum: `COLLECTION_CENTER`, `DIAGNOSTIC_CENTER`, `HOSPITAL` |  |
| `labs[].address` | string, nullable | no |  |  |  |
| `labs[].locality` | string, nullable | no |  |  |  |
| `labs[].city` | string, nullable | no |  |  |  |
| `labs[].state` | string, nullable | no |  |  |  |
| `labs[].pincode` | string, nullable | no |  |  |  |
| `labs[].latitude` | number, nullable | no | Null when the lab's location is not available. |  |  |
| `labs[].longitude` | number, nullable | no | Null when the lab's location is not available. |  |  |
| `labs[].isHomeSampleSupported` | boolean | no | True if the lab does home sample collection. |  |  |
| `labs[].isCenterVisitSupported` | boolean | no | True if the patient can visit the lab for tests. |  |  |
| `labs[].packages` | array<object> | no | Every package from your store network that this lab offers, for home sample collection and center visits alike. It is not filtered by service; whether a package can be done at home or at a center is given by isHomeSampleSupported and isCenterVisitSupported on getPackage. |  |  |
| `labs[].packages[].lsId` | string | no |  |  |  |
| `labs[].packages[].name` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "labs": [
    {
      "labName": "Prima Diagnostics - Jayanagar",
      "labLogo": "www.image.com",
      "labId": 32632,
      "lsChainId": 12,
      "chainName": "Prima Diagnostics",
      "chainLogo": "www.image.com",
      "type": "COLLECTION_CENTER",
      "address": "435, 3rd Main, 4th T Block",
      "locality": "Jayanagar",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560035",
      "latitude": 13.275472,
      "longitude": 77.2323213,
      "isHomeSampleSupported": true,
      "isCenterVisitSupported": false,
      "packages": [
        {
          "lsId": "LSP10019",
          "name": "Comprehensive Allergy Panel"
        },
        {
          "lsId": "LSP10003",
          "name": "Advanced Package"
        },
        {
          "lsId": "LSP10020",
          "name": "Disease Risk Screening Package"
        }
      ]
    },
    {
      "labName": "Spectrum Diagnostics",
      "labLogo": null,
      "labId": 56,
      "lsChainId": null,
      "chainName": null,
      "chainLogo": null,
      "type": "DIAGNOSTIC_CENTER",
      "address": "31, Dr Rajkumar Road",
      "locality": "Rajajinagar",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560010",
      "latitude": 13.03375432,
      "longitude": 78.2323993,
      "isHomeSampleSupported": true,
      "isCenterVisitSupported": true,
      "packages": [
        {
          "lsId": "LSP10029",
          "name": "LS Busy Professional"
        },
        {
          "lsId": "LSP10003",
          "name": "Advanced Package"
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

### GET /api/v1.3/network/getPackage

**Get package details**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns a single package with per-lab pricing and serviceability.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `packageId` | query | string | yes | The LS id of the package to fetch (e.g. LSP10023). |  | "LSP10023" |
| `pincode` | query | string | no | Optional. Filter labs servicing this pincode; adds distance for center-visit labs. |  | "560035" |
| `latitude` | query | string | no | Optional. Filter labs servicing this lat/long; adds distance for center-visit labs. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Filter labs servicing this lat/long; adds distance for center-visit labs. |  | "77.537758" |

#### Responses

##### 200

Package details

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `packageId` | string | no |  |  |  |
| `packageName` | string | no |  |  |  |
| `displayName` | string | no | Store-configured name; falls back to packageName |  |  |
| `description` | string, nullable | no |  |  |  |
| `price` | number | no | Max price charged for this package across labs |  |  |
| `mrp` | number, nullable | no | Default MRP configured in LabStack; null if none |  |  |
| `tat` | integer, nullable | no | Turnaround time in hours |  |  |
| `isHomeSampleSupported` | boolean | no |  |  |  |
| `isCenterVisitSupported` | boolean | no |  |  |  |
| `isKitBasedSupported` | boolean | no |  |  |  |
| `sampleTypes` | array<string> | no | Sample types across all tests in the package |  |  |
| `tests` | array<object> | no |  |  |  |
| `tests[].testName` | string | no |  |  |  |
| `tests[].lsTestId` | string | no |  |  |  |
| `labs` | array<object> | no | Labs in the store network supporting the package (filtered by location if provided). |  |  |
| `labs[].labName` | string | no |  |  |  |
| `labs[].labLogo` | string, nullable | no |  |  |  |
| `labs[].lsLabId` | number | no |  |  |  |
| `labs[].lsChainId` | number, nullable | no |  |  |  |
| `labs[].mrp` | number | no | MRP for this package at this lab (store MRP, may be lab-overridden) |  |  |
| `labs[].price` | number | no | Store's cost for this package at this lab |  |  |
| `labs[].labMrp` | number, nullable | no | Lab's own consumer MRP, or null if not configured |  |  |
| `labs[].sampleReportUrl` | string, nullable | no |  |  |  |
| `labs[].isHomeSampleSupported` | boolean | no |  |  |  |
| `labs[].isCenterVisitSupported` | boolean | no |  |  |  |
| `labs[].distance` | number, nullable | no | Only when a location is given; null if the lab has no center visit |  |  |
| `labs[].requiredParameters` | array<object> | no | Individual parameters expected in the lab report for this package (requires configuration). |  |  |
| `labs[].requiredParameters[].testName` | string | no |  |  |  |
| `labs[].requiredParameters[].lsTestId` | string | no |  |  |  |
| `tags` | array<object> | no |  |  |  |
| `tags[].tagId` | number | no |  |  |  |
| `tags[].tagName` | string | no |  |  |  |
| `tags[].categoryId` | number | no |  |  |  |
| `tags[].categoryName` | string | no |  |  |  |
| `preparations` | array<string> | no | Preparations to do before sample collection |  |  |

Example:
```json
{
  "status": "success",
  "packageId": "LSP10001",
  "packageName": "Liver Function Test",
  "displayName": "Liver Care",
  "description": null,
  "price": 3800,
  "mrp": null,
  "tat": 24,
  "isHomeSampleSupported": true,
  "isCenterVisitSupported": true,
  "isKitBasedSupported": false,
  "sampleTypes": [
    "Blood"
  ],
  "tests": [
    {
      "testName": "Creatine",
      "lsTestId": "LS120021"
    },
    {
      "testName": "Urea",
      "lsTestId": "LS120022"
    }
  ],
  "labs": [
    {
      "labName": "Lab name 1",
      "labLogo": "www.image.com",
      "lsLabId": 3,
      "lsChainId": null,
      "mrp": 4000,
      "price": 3200,
      "labMrp": null,
      "sampleReportUrl": null,
      "isHomeSampleSupported": true,
      "isCenterVisitSupported": false,
      "distance": 2.00032,
      "requiredParameters": [
        {
          "testName": "Bilirubin Direct",
          "lsTestId": "LSL100108"
        },
        {
          "testName": "Bilirubin Total",
          "lsTestId": "LSL100109"
        },
        {
          "testName": "Bilirubin Indirect",
          "lsTestId": "LSL101495"
        }
      ]
    },
    {
      "labName": "Orange Health",
      "labLogo": null,
      "lsLabId": 16,
      "lsChainId": 2,
      "mrp": 4200,
      "price": 3800,
      "labMrp": 5000,
      "sampleReportUrl": "https://console.labstack.in/api/v1.3/network/getSampleReport?packageLsId=LSP10001&labId=3",
      "isHomeSampleSupported": true,
      "isCenterVisitSupported": true,
      "distance": 3.2323,
      "requiredParameters": [
        {
          "testName": "Bilirubin Direct",
          "lsTestId": "LSL100108"
        },
        {
          "testName": "Bilirubin Total",
          "lsTestId": "LSL100109"
        }
      ]
    }
  ],
  "tags": [
    {
      "tagId": 2,
      "tagName": "Kidney",
      "categoryId": 1,
      "categoryName": "Organ"
    },
    {
      "tagId": 6,
      "tagName": "Exercise",
      "categoryId": 3,
      "categoryName": "Lifestyle"
    }
  ],
  "preparations": [
    "Fasting for 12 hours",
    "Stop cholesterol medicines"
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

### GET /api/v1.3/network/getPackagePreparations

**Get package preparations**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns comma-joined preparation instructions for a package.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `packageId` | query | string | yes | Package id to fetch preparations for (e.g. LSP10001). Deprecated - preparations are also provided via getPackage. |  | "LSP10001" |

#### Responses

##### 200

Package preparations

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `preparations` | string | no | Comma-separated list of preparation phrases |  |  |

Example:
```json
{
  "status": "success",
  "preparations": "Fasting for 12 hours, Stop cholesterol medicines"
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

### GET /api/v1.3/network/getPackageTags

**List package tags**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns all package tags/categories available to the store.

#### Responses

##### 200

Package tags

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `tags` | array<object> | no |  |  |  |
| `tags[].tagId` | number | no |  |  |  |
| `tags[].tagName` | string | no |  |  |  |
| `tags[].categoryId` | number | no |  |  |  |
| `tags[].categoryName` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "tags": [
    {
      "tagId": 2,
      "tagName": "Kidney",
      "categoryId": 1,
      "categoryName": "Organ"
    },
    {
      "tagId": 6,
      "tagName": "Exercise",
      "categoryId": 3,
      "categoryName": "Lifestyle"
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

### GET /api/v1.3/network/getPackages

**List packages**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists packages and super-packages with price ranges, filtered by serviceable location. Optionally restrict the results to packages offered by specific labs via `labIds`. Filters combine, so a package is only returned if it is offered by a lab that satisfies every filter supplied. `packages` and `super-packages` are matched independently, so both fields are always present in a success response - either may be empty while the other is not.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `pincode` | query | string | no | Optional. Filter to packages offered by labs servicing this pincode. Response may be delayed while checking with labs. |  | "560035" |
| `latitude` | query | string | no | Optional. Filter to packages offered by labs servicing this lat/long. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Filter to packages offered by labs servicing this lat/long. |  | "77.537758" |
| `labIds` | query | string | no | Optional. Comma-separated lab ids (as returned by List labs). Only packages offered by these labs are returned. Every id must be a lab in your store network, otherwise the request fails. A lab that is in your network but temporarily unavailable is accepted and simply contributes no packages, so the response can be empty rather than an error. |  | "32632,56" |

#### Responses

##### 200

Packages and super-packages

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `count` | integer | no | Number of packages returned |  |  |
| `packages` | array<object> | no |  |  |  |
| `packages[].packageId` | string | no |  |  |  |
| `packages[].packageName` | string | no |  |  |  |
| `packages[].displayName` | string | no | Store-configured name; falls back to packageName |  |  |
| `packages[].description` | string, nullable | no |  |  |  |
| `packages[].price` | number | no | Deprecated. Same value as maxPrice. |  |  |
| `packages[].minPrice` | number | no |  |  |  |
| `packages[].maxPrice` | number | no |  |  |  |
| `packages[].minMrp` | number, nullable | no |  |  |  |
| `packages[].maxMrp` | number, nullable | no |  |  |  |
| `packages[].tat` | number | no | Turnaround time in hours |  |  |
| `packages[].sampleType` | array<string> | no |  |  |  |
| `packages[].tests` | array<object> | no |  |  |  |
| `packages[].tests[].testName` | string | no |  |  |  |
| `packages[].tests[].lsTestId` | string | no |  |  |  |
| `packages[].tags` | array<object> | no |  |  |  |
| `packages[].tags[].tagId` | number | no |  |  |  |
| `packages[].tags[].tagName` | string | no |  |  |  |
| `packages[].tags[].categoryId` | number | no |  |  |  |
| `packages[].tags[].categoryName` | string | no |  |  |  |
| `superPackages` | array<object> | no | Super-packages (bundles of packages); shape mirrors packages. |  |  |

Example:
```json
{
  "status": "success",
  "count": 2,
  "packages": [
    {
      "packageId": "LSP10023",
      "packageName": "Renal Profile",
      "displayName": "Renal Supreme",
      "description": null,
      "price": 3800,
      "minPrice": 3200,
      "maxPrice": 3800,
      "minMrp": null,
      "maxMrp": null,
      "tat": 24,
      "sampleType": [
        "Blood",
        "Urine",
        "Stool"
      ],
      "tests": [
        {
          "testName": "Creatine",
          "lsTestId": "LS120021"
        },
        {
          "testName": "Urea",
          "lsTestId": "LS120022"
        }
      ],
      "tags": [
        {
          "tagId": 2,
          "tagName": "Kidney",
          "categoryId": 1,
          "categoryName": "Organ"
        },
        {
          "tagId": 6,
          "tagName": "Exercise",
          "categoryId": 3,
          "categoryName": "Lifestyle"
        }
      ]
    },
    {
      "packageId": "LSP10024",
      "packageName": "Comprehensive Metabolic Panel",
      "displayName": "Comprehensive Metabolic Panel",
      "description": "This package is great!",
      "price": 5000,
      "minPrice": 5000,
      "maxPrice": 5000,
      "minMrp": null,
      "maxMrp": null,
      "tat": 48,
      "sampleType": [
        "Serum"
      ],
      "tests": [
        {
          "testName": "TSH",
          "lsTestId": "LS120023"
        },
        {
          "testName": "T4",
          "lsTestId": "LS120024"
        }
      ],
      "tags": []
    }
  ],
  "superPackages": []
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

### GET /api/v1.3/network/getSampleReport

**Download sample report**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Streams a sample report PDF for a package at a lab. On success the response has content-type application/pdf and content-disposition attachment (the browser downloads the file). Returns a 4XX error if no sample report is available for the package/lab.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `packageLsId` | query | string | yes | LS package id (e.g. LSP10001). |  | "LSP10001" |
| `labId` | query | string | yes | Lab id to fetch the sample report for. |  | "3" |

#### Responses

##### 200

Sample report PDF

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

### GET /api/v1.3/network/getTest

**Get test details**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns a single test with per-lab pricing (the store's configured rates applied) and standard ranges.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `testId` | query | string | yes | The LS id of the test to fetch (e.g. LSL100336). |  | "LSL100336" |
| `pincode` | query | string | no | Optional. Filter labs servicing this pincode. |  | "560035" |
| `latitude` | query | string | no | Optional. Filter labs servicing this lat/long. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Filter labs servicing this lat/long. |  | "77.537758" |

#### Responses

##### 200

Test details

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `lsId` | string | no |  |  |  |
| `name` | string | no |  |  |  |
| `category` | string | no |  | enum: `ROUTINE`, `NON_ROUTINE` |  |
| `description` | string | no |  |  |  |
| `isHomeSampleSupported` | boolean | no |  |  |  |
| `isCenterVisitSupported` | boolean | no |  |  |  |
| `minTat` | integer, nullable | no | Lowest TAT across labs (hours); null if none configured |  |  |
| `minMrp` | number, nullable | no | Lowest MRP across labs; null if none configured |  |  |
| `aliases` | array<string> | no |  |  |  |
| `labs` | array<object> | no |  |  |  |
| `labs[].labName` | string | no |  |  |  |
| `labs[].labLogo` | string, nullable | no |  |  |  |
| `labs[].lsLabId` | number | no |  |  |  |
| `labs[].lsChainId` | number, nullable | no |  |  |  |
| `labs[].mrp` | number | no | Lab's suggested sale price for the test |  |  |
| `labs[].price` | number | no | Store's cost for the test at this lab: the MRP with the store's configured rates applied |  |  |
| `testRanges` | object, nullable | no |  |  |  |
| `testRanges.units` | string | no |  |  |  |
| `testRanges.type` | string | no |  | enum: `RANGE`, `DESCRIPTIVE` |  |
| `testRanges.ranges` | array<object> | no |  |  |  |
| `testRanges.ranges[].demographic` | string | no |  | enum: `NONE`, `GENDER`, `AGE_BRACKET` |  |
| `testRanges.ranges[].demographicValue` | string, nullable | no | e.g. MALE / FEMALE / OTHERS or NEONATAL / ADULT |  |  |
| `testRanges.ranges[].color` | string | no |  | enum: `GREEN`, `YELLOW`, `RED` |  |
| `testRanges.ranges[].label` | string, nullable | no |  |  |  |
| `testRanges.ranges[].low` | number, nullable | no | RANGE only; at least one of low/high is set |  |  |
| `testRanges.ranges[].high` | number, nullable | no | RANGE only; at least one of low/high is set |  |  |

Example:
```json
{
  "status": "success",
  "lsId": "LSL100336",
  "name": "Glycosylated hemoglobin",
  "category": "ROUTINE",
  "description": "Measures average blood glucose over the past 2-3 months",
  "isHomeSampleSupported": true,
  "isCenterVisitSupported": true,
  "minTat": 24,
  "minMrp": 300,
  "aliases": [
    "HbA1c",
    "Glycosylated Hb"
  ],
  "labs": [
    {
      "labName": "Redcliffe Labs Pvt Ltd",
      "labLogo": "www.image.com",
      "lsLabId": 2,
      "lsChainId": null,
      "mrp": 3100,
      "price": 2480
    },
    {
      "labName": "Orange Health - Bangalore",
      "labLogo": null,
      "lsLabId": 4,
      "lsChainId": 2,
      "mrp": 1900,
      "price": 1520
    }
  ],
  "testRanges": {
    "units": "%",
    "type": "RANGE",
    "ranges": [
      {
        "demographic": "NONE",
        "demographicValue": null,
        "color": "RED",
        "label": "Very Low",
        "low": null,
        "high": 4
      },
      {
        "demographic": "NONE",
        "demographicValue": null,
        "color": "GREEN",
        "label": "Optimal",
        "low": 4,
        "high": 5.7
      },
      {
        "demographic": "NONE",
        "demographicValue": null,
        "color": "YELLOW",
        "label": "Pre-Diabetes",
        "low": 5.7,
        "high": 6.4
      },
      {
        "demographic": "NONE",
        "demographicValue": null,
        "color": "RED",
        "label": "Diabetes",
        "low": 6.4,
        "high": null
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

### GET /api/v1.3/network/getTests

**List tests**

Tag: Network · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns all active tests supported by labs enabled for the authenticated store. Optionally filter to tests offered by labs that service a given pincode or lat/long — when a location filter is supplied the response may be delayed while labs are queried. Tests can also be restricted to specific labs via `labIds`. Filters combine, so a test is only returned if it is offered by a lab that satisfies every filter supplied. See Appendix (Test Category) for the possible `category` values.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `pincode` | query | string | no | Optional. Filter to tests offered by labs servicing this pincode. Response may be delayed while checking with labs. |  | "560035" |
| `latitude` | query | string | no | Optional. Filter to tests offered by labs servicing this lat/long. |  | "13.045163" |
| `longitude` | query | string | no | Optional. Filter to tests offered by labs servicing this lat/long. |  | "77.537758" |
| `labIds` | query | string | no | Optional. Comma-separated lab ids (as returned by List labs). Only tests offered by these labs are returned. Every id must be a lab in your store network, otherwise the request fails. A lab that is in your network but temporarily unavailable is accepted and simply contributes no tests, so the response can be empty rather than an error. |  | "32632,56" |

#### Responses

##### 200

Store tests

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `count` | integer | no | Number of tests returned |  |  |
| `tests` | array<object> | no |  |  |  |
| `tests[].lsId` | string | no |  |  |  |
| `tests[].name` | string | no |  |  |  |
| `tests[].category` | string | no |  | enum: `ROUTINE`, `NON_ROUTINE` |  |
| `tests[].preparationNotes` | string | no | Preparation instructions for the test, or an empty string if none |  |  |
| `tests[].aliases` | array<string> | no | Alternative names for the test |  |  |

Example:
```json
{
  "status": "success",
  "count": 2,
  "tests": [
    {
      "lsId": "LSL100336",
      "name": "Glycosylated hemoglobin",
      "category": "ROUTINE",
      "preparationNotes": "",
      "aliases": [
        "HbA1c",
        "H1c Test",
        "Glycosylated Hb"
      ]
    },
    {
      "lsId": "LSL102387",
      "name": "Opiates Morphine",
      "category": "NON_ROUTINE",
      "preparationNotes": "12 hours fasting",
      "aliases": [
        "Opiates"
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

## Order

### GET /api/v1.3/order/cancelOrder

**Cancel an order**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Cancels an order for the store and notifies the lab. An order cannot be cancelled within 30 minutes of its appointment time, or once that time has passed. This GET has side effects.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | yes | Order id to cancel. |  | "47585" |
| `reason` | query | string | no | Optional. Cancellation reason. Defaults to "Customer requested cancellation". |  |  |

#### Responses

##### 200

Order cancelled

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.orderStatus` | string | no |  | enum: `PENDING`, `CANCELED` |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 47585,
    "orderStatus": "CANCELED"
  }
}
```

##### 202

Cancellation pending at lab

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "pending" |
| `message` | string | no |  |  |  |

Example:
```json
{
  "status": "pending",
  "message": "Cancellation started. Check order status in a few minutes"
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

### POST /api/v1.3/order/escalation

**Raise an order escalation**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates a store escalation tied to an order.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | yes | Order id to raise the escalation against. |  |  |
| `complaint` | string | yes | Short complaint title (e.g. "Delayed report"). |  |  |
| `severity` | string | yes | Escalation severity. | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |
| `description` | string | no | Optional. Detailed description of the issue. |  |  |
| `notes` | string | no | Optional. Additional notes for our team. |  |  |

Example:
```json
{
  "orderId": 47585,
  "complaint": "Delayed report",
  "description": "Report was expected yesterday but has not been delivered.",
  "severity": "MEDIUM",
  "notes": "Customer has called twice."
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
| `escalation.severity` | string | no |  | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |

Example:
```json
{
  "status": "success",
  "escalation": {
    "id": 532,
    "complaint": "Delayed report",
    "status": "PENDING",
    "severity": "MEDIUM"
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

### GET /api/v1.3/order/getEscalationDetails

**Get order escalation details**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns the full record of one escalation raised on one of the store's lab orders: the complaint, its description and notes, current status and severity, the patient, lab and order it concerns, and links to any attached images.

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
| `escalationDetails.entityType` | string | no | What the escalation is raised on. Always ORDER for this endpoint. | enum: `ORDER` |  |
| `escalationDetails.orderId` | integer | no |  |  |  |
| `escalationDetails.orderType` | string | no |  | enum: `HOME_SAMPLE`, `CENTER_VISIT`, `CAMP`, `KIT_BASED`, `SAMPLE_DROP_OFF` |  |
| `escalationDetails.status` | string | no |  | enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED` |  |
| `escalationDetails.severity` | string | no |  | enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |  |
| `escalationDetails.userName` | string, nullable | no | Name of the patient the order is for. |  |  |
| `escalationDetails.uniqueId` | string, nullable | no | The patient's unique id as supplied by the store. |  |  |
| `escalationDetails.labId` | integer, nullable | no |  |  |  |
| `escalationDetails.labName` | string, nullable | no |  |  |  |
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
    "complaint": "Delayed report",
    "description": "Report was expected yesterday but has not been delivered.",
    "notes": "Customer has called twice.",
    "entityType": "ORDER",
    "orderId": 47585,
    "orderType": "HOME_SAMPLE",
    "status": "PENDING",
    "severity": "MEDIUM",
    "userName": "Priya Sharma",
    "uniqueId": "CUST-10442",
    "labId": 12,
    "labName": "Lab name 1",
    "createdAt": "2026-10-14T06:30:10.000Z",
    "updatedAt": "2026-10-14T06:30:10.000Z",
    "images": [
      {
        "type": "ISSUE",
        "id": 1204,
        "link": "https://integration.labstack.in/api/v1.3/order/getEscalationImage?orderId=47585&type=ISSUE&imageId=1204"
      },
      {
        "type": "RESOLUTION",
        "id": 1219,
        "link": "https://integration.labstack.in/api/v1.3/order/getEscalationImage?orderId=47585&type=RESOLUTION&imageId=1219"
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

No escalation with this id exists on the store's orders

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

### GET /api/v1.3/order/getEscalationImage

**Download an order escalation image**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns one image attached to an escalation on the store's lab order. ISSUE images were attached when the escalation was raised; RESOLUTION images were added while resolving it. Use the ready-made links in the images array of getEscalationDetails rather than building this URL yourself.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | integer | yes | Order the escalation was raised on. |  | 47585 |
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

No image with this id exists on an escalation for this order

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

### GET /api/v1.3/order/getEscalations

**List order escalations**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Paginated list of escalations raised on the store's lab orders, newest first. Returns the basic fields only; use getEscalationDetails for the full record of one escalation.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | query | string | no | Only return escalations in this status. | enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED` |  |
| `orderId` | query | integer | no | Only return escalations raised on this order. |  | 47585 |
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
| `escalations[].orderId` | integer | no |  |  |  |
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
      "complaint": "Phlebotomist did not arrive",
      "orderId": 47612,
      "status": "IN_PROGRESS",
      "severity": "HIGH",
      "createdAt": "2026-10-15T09:12:44.000Z",
      "updatedAt": "2026-10-15T11:40:02.000Z"
    },
    {
      "escalationId": 532,
      "complaint": "Delayed report",
      "orderId": 47585,
      "status": "PENDING",
      "severity": "MEDIUM",
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

### GET /api/v1.3/order/getOrderDetails

**Get order details**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns full detail for one order including report download links. Provide orderId or referenceId (at least one). orderId takes precedence and overrides referenceId if both are given.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | no | Order id to fetch details for. Required if referenceId not given. Overrides referenceId if given. |  | "47585" |
| `referenceId` | query | string | no | Reference id to fetch details for. Required if orderId not given. Ignored if orderId given. |  |  |

#### Responses

##### 200

Order details

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `orderDetails` | object | no |  |  |  |
| `orderDetails.orderId` | number | no |  |  |  |
| `orderDetails.orderType` | string | no |  | enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `orderDetails.orderStatus` | string | no |  | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_MISSED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `PHLEBO_NO_SHOW`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_REJECTED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED`, `RESCHEDULED`, `CANCELED` |  |
| `orderDetails.isVip` | boolean | no |  |  |  |
| `orderDetails.appointment` | string | no | ISO 8601 date-time |  |  |
| `orderDetails.referenceId` | string, nullable | no | Same value given when placing the order |  |  |
| `orderDetails.labOrderId` | string, nullable | no | Order's id on the lab's system |  |  |
| `orderDetails.phleboName` | string, nullable | no |  |  |  |
| `orderDetails.phleboNumber` | string, nullable | no |  |  |  |
| `orderDetails.labName` | string | no |  |  |  |
| `orderDetails.labLogo` | string, nullable | no |  |  |  |
| `orderDetails.lsLabId` | number | no |  |  |  |
| `orderDetails.lsChainId` | number, nullable | no | Null if the lab is not part of a chain |  |  |
| `orderDetails.packageIds` | array<string> | no | LS package ids in the order |  |  |
| `orderDetails.testIds` | array<string> | no | LS test ids in the order |  |  |
| `orderDetails.notes` | string, nullable | no |  |  |  |
| `orderDetails.uniqueId` | string | no |  |  |  |
| `orderDetails.name` | string | no |  |  |  |
| `orderDetails.preparations` | string | no | Preparations to do before sample collection |  |  |
| `orderDetails.dateOfBirth` | string, nullable | no | YYYY-MM-DD |  |  |
| `orderDetails.age` | number, nullable | no |  |  |  |
| `orderDetails.gender` | string | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `orderDetails.mobile` | string | no |  |  |  |
| `orderDetails.altContact` | string, nullable | no |  |  |  |
| `orderDetails.unitFloorBuilding` | string, nullable | no |  |  |  |
| `orderDetails.address` | string | no |  |  |  |
| `orderDetails.locality` | string, nullable | no |  |  |  |
| `orderDetails.city` | string | no |  |  |  |
| `orderDetails.state` | string | no |  |  |  |
| `orderDetails.pincode` | string | no |  |  |  |
| `orderDetails.reports` | array<object> | no |  |  |  |
| `orderDetails.reports[].link` | string | no | Report PDF download link |  |  |
| `orderDetails.reports[].type` | string | no |  | enum: `FULL`, `PARTIAL` |  |
| `orderDetails.isPaymentRequired` | boolean | no | True while the order is still awaiting the payment it was placed with. Becomes false once the payment goes through, at which point an order status webhook is sent with the PAYMENT_RECEIVED event. Always false for orders placed without isPaymentRequired. |  |  |
| `orderDetails.cancelReason` | string | no |  |  |  |
| `orderDetails.updatedAt` | string | no | ISO 8601 date-time |  |  |

Example:
```json
{
  "status": "success",
  "orderDetails": {
    "orderId": 47585,
    "orderType": "HOME_SAMPLE",
    "orderStatus": "PHLEBO_ASSIGNED",
    "isVip": false,
    "appointment": "2023-12-23T18:25:43.511Z",
    "referenceId": "P10012",
    "labOrderId": "BLR1234",
    "phleboName": "Bob Smith",
    "phleboNumber": "8047359194",
    "labName": "Lab name 1",
    "labLogo": "www.image.com",
    "lsLabId": 57,
    "lsChainId": 3,
    "packageIds": [
      "LSP10029",
      "LSP10871"
    ],
    "testIds": [
      "LSL110001",
      "LSL110002"
    ],
    "notes": "Patient is old, veins are thin.",
    "uniqueId": "U1234",
    "name": "Bob Smith",
    "preparations": "Fasting for 12 hours",
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
    "reports": [
      {
        "link": "https://integration.labstack.in/api/v1.3/order/getReport?orderId=34&reportId=0",
        "type": "FULL"
      }
    ],
    "isPaymentRequired": false,
    "cancelReason": "",
    "updatedAt": "2024-12-11T12:20:52.623Z"
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

### GET /api/v1.3/order/getOrders

**List orders**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns orders with their appointments for the store, optionally filtered by a start/end appointment-date range, by those updated since a date, and by user email.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `startDate` | query | string | no | Optional. Filter orders with appointments after this date. ISO 8601 date-time. |  | "2026-01-01T00:00:00.000Z" |
| `endDate` | query | string | no | Optional. Filter orders with appointments before this date. ISO 8601 date-time. |  | "2026-12-31T23:59:59.000Z" |
| `updatedSince` | query | string | no | Optional. Filter orders updated since this date. ISO 8601 date-time. |  |  |
| `email` | query | string | no | Optional. Filter orders placed for a user with this email (case-insensitive). |  |  |

#### Responses

##### 200

List of orders

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `orders` | array<object> | no |  |  |  |
| `orders[].orderId` | number | no | LabStack order id |  |  |
| `orders[].orderType` | string | no |  | enum: `HOME_SAMPLE`, `CENTER_VISIT` |  |
| `orders[].referenceId` | string, nullable | no | Reference id given when placing the order |  |  |
| `orders[].appointment` | string | no | Appointment time, ISO 8601 |  |  |
| `orders[].orderStatus` | string | no |  | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_MISSED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `PHLEBO_NO_SHOW`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_REJECTED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED`, `RESCHEDULED`, `CANCELED` |  |
| `orders[].phleboName` | string, nullable | no |  |  |  |
| `orders[].phleboNumber` | string, nullable | no |  |  |  |
| `orders[].labName` | string | no |  |  |  |
| `orders[].labLogo` | string, nullable | no |  |  |  |
| `orders[].lsLabId` | number | no |  |  |  |
| `orders[].lsChainId` | number, nullable | no | Null if the lab is not part of a chain |  |  |
| `orders[].updatedAt` | string | no | Last update time, ISO 8601 |  |  |

Example:
```json
{
  "status": "success",
  "orders": [
    {
      "orderId": 47585,
      "orderType": "HOME_SAMPLE",
      "referenceId": "123",
      "appointment": "2023-12-23T18:25:43.511Z",
      "orderStatus": "SAMPLE_PROCESSED",
      "phleboName": "Bob Smith",
      "phleboNumber": "8047359194",
      "labName": "Lab name 1",
      "labLogo": "www.image.com",
      "lsLabId": 12,
      "lsChainId": 2,
      "updatedAt": "2024-12-11T12:20:52.623Z"
    },
    {
      "orderId": 47586,
      "orderType": "HOME_SAMPLE",
      "referenceId": "124",
      "appointment": "2023-11-03T21:45:23.211Z",
      "orderStatus": "ORDER_SCHEDULED",
      "phleboName": null,
      "phleboNumber": null,
      "labName": "Lab name 2",
      "labLogo": null,
      "lsLabId": 14,
      "lsChainId": null,
      "updatedAt": "2024-12-08T10:23:54.610Z"
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

### GET /api/v1.3/order/getReport

**Download order report PDF**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Streams the order's report as a PDF (orderId=0 returns a dummy sample report).

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | yes | Order id to get the report PDF of. Use 0 to download a dummy sample report. |  | "47585" |
| `reportId` | query | string | yes | Report id to download (found in the reports[] of getOrderDetails or the webhook payload). |  | "0" |

#### Responses

##### 200

Report PDF

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

### GET /api/v1.3/order/getReportRawValues

**Get order report values**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Returns standardized test values for an order; available only when the order status is REPORT_DELIVERED. If the values have not been generated yet, the call first tries to retrieve them, which can take up to about 20 seconds, and returns them with a 200 when that succeeds. Otherwise, when the order has a valid report, extraction is started automatically and a 202 is returned — retry the call in a few minutes, or wait for the HARMONIZED_VALUES_CHANGED order webhook. Extraction is attempted at most once per order, so a 400 for an order in REPORT_DELIVERED means the values are not going to become available without LabStack support. A 409 means the order has not reached REPORT_DELIVERED yet but still can; retry later, or wait for the order STATUS_CHANGED webhook announcing REPORT_DELIVERED before calling. A CANCELED order never reaches REPORT_DELIVERED, so it gets a 400 and retrying will not help. testValues can include tests the report shows beyond those ordered.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | yes | Order id to get raw report values for. Only available when the order status is REPORT_DELIVERED. |  | "47585" |

#### Responses

##### 200

Standardized test values

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `testValues` | array<object> | no |  |  |  |
| `testValues[].packageId` | string, nullable | no | LS package id (e.g. LSP10002) of the package the test was reported under, when known. |  |  |
| `testValues[].packageName` | string, nullable | no |  |  |  |
| `testValues[].profileId` | string, nullable | no | LS id of the profile the test belongs to, when it is part of one. |  |  |
| `testValues[].profileName` | string, nullable | no |  |  |  |
| `testValues[].testId` | string | no | LS test id (e.g. LSL100018). Always present, and distinct where the same test name is used for different sample types. |  |  |
| `testValues[].testName` | string | no |  |  |  |
| `testValues[].value` | string | no | Measured value (a number or a descriptive string) |  |  |
| `testValues[].units` | string, nullable | no |  |  |  |
| `testValues[].method` | string, nullable | no |  |  |  |
| `testValues[].isHighlighted` | boolean | no | True when the matched range colour is not GREEN |  |  |
| `testValues[].rangesType` | string | no |  | enum: `RANGE`, `DESCRIPTIVE` |  |
| `testValues[].matchedRange` | object, nullable | no |  |  |  |
| `testValues[].matchedRange.label` | string, nullable | no |  |  |  |
| `testValues[].matchedRange.color` | string | no |  | enum: `GREEN`, `YELLOW`, `RED` |  |
| `testValues[].matchedRange.low` | number, nullable | no | RANGE only. If only low, read as value < low. |  |  |
| `testValues[].matchedRange.high` | number, nullable | no | RANGE only. If only high, read as value > high. |  |  |
| `testValues[].matchedRange.description` | array<string> | no | DESCRIPTIVE only. Value matches if it equals any entry. |  |  |
| `testValues[].ranges` | array<object> | no | All possible ranges for the test. |  |  |
| `testValues[].ranges[].label` | string, nullable | no |  |  |  |
| `testValues[].ranges[].color` | string | no |  | enum: `GREEN`, `YELLOW`, `RED` |  |
| `testValues[].ranges[].low` | number, nullable | no | RANGE only |  |  |
| `testValues[].ranges[].high` | number, nullable | no | RANGE only |  |  |
| `testValues[].ranges[].description` | array<string> | no | DESCRIPTIVE only |  |  |

Example:
```json
{
  "status": "success",
  "testValues": [
    {
      "packageId": "LSP10002",
      "packageName": "Advanced Package",
      "profileId": "LSP10870",
      "profileName": "Diabetes Markers",
      "testId": "LSL100018",
      "testName": "Glucose Fasting",
      "value": "127",
      "units": "mg/dL",
      "method": null,
      "isHighlighted": true,
      "rangesType": "RANGE",
      "matchedRange": {
        "label": "Danger",
        "color": "RED",
        "low": 125,
        "high": null
      },
      "ranges": [
        {
          "label": "Desirable",
          "color": "GREEN",
          "low": 70,
          "high": 100
        },
        {
          "label": null,
          "color": "YELLOW",
          "low": 101,
          "high": 125
        },
        {
          "label": "Danger",
          "color": "RED",
          "low": 125,
          "high": null
        }
      ]
    },
    {
      "packageId": "LSP10002",
      "packageName": "Advanced Package",
      "profileId": "LSP10870",
      "profileName": "Diabetes Markers",
      "testId": "LSL100245",
      "testName": "Colour Urine",
      "value": "Pale Yellow",
      "units": "Description",
      "method": null,
      "isHighlighted": true,
      "rangesType": "DESCRIPTIVE",
      "matchedRange": {
        "label": "Desirable",
        "color": "GREEN",
        "description": [
          "Pale Yellow",
          "Light Yellow"
        ]
      },
      "ranges": [
        {
          "label": "Desirable",
          "color": "GREEN",
          "description": [
            "Pale Yellow",
            "Light Yellow"
          ]
        },
        {
          "label": "Slight Risk",
          "color": "YELLOW",
          "description": [
            "Dark Yellow",
            "Amber"
          ]
        },
        {
          "label": "High Risk",
          "color": "RED",
          "description": [
            "Dark Amber",
            "Red",
            "Brown"
          ]
        }
      ]
    }
  ]
}
```

##### 202

Values are not available yet and are being extracted from the report

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "pending" |
| `message` | string | no |  |  |  |

Example:
```json
{
  "status": "pending",
  "message": "Raw values for order 47585 are being extracted. Check back in a few minutes, or wait for the HARMONIZED_VALUES_CHANGED order webhook."
}
```

##### 400

The call cannot return values. Returned when orderId is missing or invalid; when the order is CANCELED, so it will never reach REPORT_DELIVERED and retrying will not help; and when the order is in REPORT_DELIVERED but its values cannot be produced, in which case error says why.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 is CANCELED and will never reach REPORT_DELIVERED, so it has no report values. Retrying will not change this."
}
```

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 409

The order exists and has not reached REPORT_DELIVERED yet but still can, so no values are available yet. The request is valid and can be repeated: retry later, or wait for the order STATUS_CHANGED webhook announcing REPORT_DELIVERED and call again then. A CANCELED order gets a 400 instead.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 is not in REPORT_DELIVERED state yet"
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

---

### POST /api/v1.3/order/placeOrder

**Place a lab order**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates an order for the authenticated store. Provide packageIds and/or testIds. pincode is always required; address/city/state are additionally required for HOME_SAMPLE orders. Either dateOfBirth or age must be provided. For a patient already on record (same uniqueId), a recorded gender or date of birth is kept, and is what the lab receives, even if this request sends different ones; only a value not yet recorded is taken from the request. Use POST /api/admin/v1.0/user/updateUserDetails to change them. orderType CAMP is not accepted by this endpoint. uniqueId is optional (auto-generated when omitted). Optionally returns a payment link when payment is required; that link is valid for 16 minutes and the order is auto-cancelled if payment is not completed in that window. Once payment completes the order is retained, getOrderDetails reports isPaymentRequired as false, and an order status webhook is sent carrying the PAYMENT_RECEIVED event. Returns 409 when your store already has an active order for the same uniqueId with exactly the same packageIds and testIds and an appointment on the same date (IST), at any time of that day and regardless of address or orderType. The same items on another date are a new order. An order stops being active once it reaches REPORT_DELIVERED, CANCELED, PHLEBO_NO_SHOW, PATIENT_MISSED or SAMPLE_REJECTED. Reschedule or cancel the existing order (its orderId is in the 409 response) instead of placing it again. referenceId is not used to detect duplicates. If a call times out, look the order up with getOrderDetails by your referenceId before retrying, and retry with the same request body only if it is not found.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderType` | string | yes | Type of order/service. | enum: `HOME_SAMPLE`, `CENTER_VISIT`, `KIT_BASED` |  |
| `isVip` | boolean | no | Optional. Marks the order as VIP. Defaults to false. |  |  |
| `isPostpaid` | boolean | no | Optional. Marks the order as postpaid. When omitted, the order is postpaid when your store collects payment from the patient, and not postpaid when LabStack or the lab collects it, which is always the case when isPaymentRequired is true. |  |  |
| `referenceId` | string | no | Optional. Your own reference id; echoed back in responses and webhooks. Not used to detect duplicate orders. Use a value unique to each order, since getOrderDetails can look an order up by it. |  |  |
| `linkOrderId` | integer | no | Optional. Link this order to an existing LabStack order id. |  |  |
| `packageIds` | array<string> | no | LS package ids to order (e.g. LSP11002). Provide packageIds and/or testIds. |  |  |
| `testIds` | array<string> | no | LS test ids to order (e.g. LSL110001). Provide packageIds and/or testIds. |  |  |
| `appointment` | string | yes | Appointment date-time, ISO 8601 format. |  | "2025-06-01T11:00:00+05:30" |
| `labId` | integer | no | Optional. Lab to place the order with. If not specified, LabStack assigns a lab. |  |  |
| `notes` | string | no | Optional. Free-text notes for the order (e.g. "Patient is old, veins are thin"). |  |  |
| `isPaymentRequired` | boolean | no | Optional. If true a payment link valid for 16 minutes is returned, and the order is auto-cancelled if it is not paid within that window. Once the payment goes through, getOrderDetails reports isPaymentRequired as false and an order status webhook is sent with the PAYMENT_RECEIVED event. Defaults to false. |  |  |
| `isSlotPreconfirmed` | boolean | no | Optional. Indicates the slot was already confirmed with the consumer. |  |  |
| `uniqueId` | string | no | Optional. Uniquely identifies the user; existing users are updated, new ids create a user. If omitted, defaults to {mobile}-{name}. |  |  |
| `name` | string | yes | Consumer name. Sanitised to alphanumerics; must be non-empty and up to 50 characters. |  |  |
| `email` | string | yes | Consumer email address. |  |  |
| `dateOfBirth` | string | no | YYYY-MM-DD. Required if age is not provided. |  |  |
| `age` | integer | no | Consumer age. Required if dateOfBirth is not provided. |  |  |
| `gender` | string | yes | Consumer gender. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `mobile` | string | yes | 10 digits, cannot start with 0. |  |  |
| `altContact` | string | no | Optional. Alternate 10-digit contact number; cannot start with 0. |  |  |
| `mainUserUniqueId` | string | no | Optional. To mark this user as a dependent, pass the uniqueId of the main user (must already exist). |  |  |
| `relationship` | string | no | Optional. Dependent's relationship to the main user. Defaults to OTHER. | enum: `OTHER`, `HUSBAND`, `WIFE`, `FATHER`, `MOTHER`, `SON`, `DAUGHTER`, `GRANDFATHER`, `GRANDMOTHER`, `GRANDSON`, `GRANDDAUGHTER`, `SON_IN_LAW`, `DAUGHTER_IN_LAW`, `BROTHER`, `SISTER`, `BROTHER_IN_LAW`, `SISTER_IN_LAW`, `UNCLE`, `AUNT`, `COUSIN`, `NEPHEW`, `NIECE`, `MOTHER_IN_LAW`, `FATHER_IN_LAW`, `PARTNER`, `FRIEND`, `NEIGHBOUR` |  |
| `unitFloorBuilding` | string | no | Optional. Not used to fetch lat/long. |  |  |
| `address` | string | no | Required for HOME_SAMPLE. Full address ({unitFloorBuilding}, {address}, {locality}, {city}, {state}) must be 20-200 characters. |  |  |
| `locality` | string | no | Optional. |  |  |
| `city` | string | no | Required for HOME_SAMPLE. |  |  |
| `state` | string | no | Required for HOME_SAMPLE. |  |  |
| `pincode` | string | yes | Always required. 6 digits. |  |  |
| `latitude` | number | no | Optional. |  |  |
| `longitude` | number | no | Optional. |  |  |

Example:
```json
{
  "orderType": "HOME_SAMPLE",
  "isVip": false,
  "isPaymentRequired": false,
  "referenceId": "REF-123",
  "packageIds": [
    "LSP11002",
    "LSP11004"
  ],
  "testIds": [
    "LSL110001",
    "LSL120031"
  ],
  "appointment": "2025-06-01T11:00:00+05:30",
  "notes": "Patient is old, veins are thin.",
  "uniqueId": "U1234",
  "name": "Bob Smith",
  "email": "bobsmith@example.com",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "mobile": "8047359194",
  "altContact": "8047359194",
  "unitFloorBuilding": "2nd Floor Tower 3",
  "address": "123 Main Road",
  "locality": "Gopalapur",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560035",
  "latitude": 13.045163,
  "longitude": 77.53775859999999
}
```

#### Responses

##### 200

Order placed

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.referenceId` | string, nullable | no | The referenceId you sent, or null if you sent none. |  |  |
| `order.preparations` | array<string> | no | Preparations to do before sample collection |  |  |
| `order.orderStatus` | string | no | Status right after booking. Usually CREATED (booked, awaiting the lab confirming the appointment) or ORDER_SCHEDULED (already confirmed). PENDING means the booking has not reached the lab and our team will be investigating the reason on priority. | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_MISSED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `PHLEBO_NO_SHOW`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_REJECTED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED`, `RESCHEDULED`, `CANCELED` |  |
| `order.labName` | string | no |  |  |  |
| `order.labLogo` | string, nullable | no |  |  |  |
| `order.lsLabId` | integer | no |  |  |  |
| `order.lsChainId` | integer, nullable | no | Null if the lab is not part of a chain |  |  |
| `order.labApiError` | string, nullable | no | Error string from the lab when placing the order, or null. Note: null does not guarantee success - confirm orderStatus is not PENDING. |  |  |
| `order.labAddress` | string, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labLocality` | string, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labCity` | string, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labState` | string, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labPincode` | string, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labLatitude` | number, nullable | no | Present for CENTER_VISIT orders |  |  |
| `order.labLongitude` | number, nullable | no | Present for CENTER_VISIT orders |  |  |
| `paymentLink` | string, nullable | no | Only returned when isPaymentRequired is true. Valid for 16 minutes from order placement. |  |  |
| `paymentLinkExpiresAt` | string (date-time), nullable | no | Only returned when isPaymentRequired is true. Always 16 minutes after order placement, regardless of the store payment configuration; the order is cancelled at this point if unpaid. |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 47585,
    "referenceId": "REF-123",
    "preparations": [
      "Fasting for 12 hours",
      "Stop cholesterol medicines"
    ],
    "orderStatus": "CREATED",
    "labName": "Lab Name 1",
    "labLogo": "www.image.com",
    "lsLabId": 12,
    "lsChainId": 2,
    "labApiError": null,
    "labAddress": null,
    "labLocality": null,
    "labCity": null,
    "labState": null,
    "labPincode": null,
    "labLatitude": null,
    "labLongitude": null
  },
  "paymentLink": null,
  "paymentLinkExpiresAt": null
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

##### 409

Duplicate order. Either your store already has an active order for this uniqueId with exactly the same packageIds and testIds and an appointment on the same date (orderId, referenceId and orderStatus identify it), or an identical request is still being processed (error only; retry after it completes).


Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |
| `orderId` | integer | no | Id of the existing active order. Absent when an identical request is still being processed. |  |  |
| `referenceId` | string, nullable | no | referenceId of the existing order, or null if it has none. Absent when an identical request is still being processed. |  |  |
| `orderStatus` | string | no | Current status of the existing order. Absent when an identical request is still being processed. | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `RESCHEDULED` |  |

Example:
```json
{
  "status": "failure",
  "error": "An active order with the same packages and tests on the same appointment date already exists for User Id 'U1234'",
  "orderId": 47585,
  "referenceId": "REF-123",
  "orderStatus": "ORDER_SCHEDULED"
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

---

### GET /api/v1.3/order/rescheduleOrder

**Reschedule an order**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Reschedules an order to a new appointment time (validates slot availability with the lab). An order cannot be rescheduled within 30 minutes of its current appointment time, or once that time has passed. This GET has side effects.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | yes | Order id to reschedule. |  | "47585" |
| `appointment` | query | string | yes | New appointment date-time, ISO 8601 format. |  | "2025-06-01T11:00:00+05:30" |

#### Responses

##### 200

Order rescheduled

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.orderStatus` | string | no |  | enum: `PENDING`, `RESCHEDULED` |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 47585,
    "orderStatus": "RESCHEDULED"
  }
}
```

##### 202

Reschedule pending at lab

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "pending" |
| `message` | string | no |  |  |  |

Example:
```json
{
  "status": "pending",
  "message": "Rescheduling started. Check order status in a few minutes"
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

### POST /api/v1.3/order/submitFeedback

**Submit order feedback**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Records your customer's feedback on one of your orders. `feedbackType` says which survey the feedback answers, and decides the rating scale and the survey answers the body must carry. Send the survey answers as top-level fields next to `rating`; do not wrap them in an object.

| feedbackType | What it rates | rating | Survey fields | Accepted when |
| --- | --- | --- | --- | --- |
| `SAMPLE_COLLECTION` | The booking and the home sample collection visit | Whole number from **1 to 5** | `phleboOnTime`, `goodPhleboBehavior`, `easyBookingProcess`: all three required, each `true` or `false` | The order is a `HOME_SAMPLE` order, is not `CANCELED` or `PENDING`, and its appointment time has passed or its sample has been collected |
| `ORDER_COMPLETE` | How likely the customer is to recommend the service | Whole number from **1 to 10** | None | The order is `REPORT_DELIVERED` |

A survey field of the other feedbackType, a missing survey field, or a rating outside its type's range is rejected with 400. `comments` is optional for both types.

An order holds one feedback per feedbackType: submitting the same feedbackType again for the same order replaces the earlier rating, survey answers and comments. A low rating opens an escalation on the order for LabStack support to follow up.

Example `SAMPLE_COLLECTION` body:

```json
{
  "orderId": 47585,
  "feedbackType": "SAMPLE_COLLECTION",
  "rating": 4,
  "phleboOnTime": false,
  "goodPhleboBehavior": true,
  "easyBookingProcess": true,
  "comments": "The phlebotomist arrived 20 minutes late but was very gentle."
}
```

Example `ORDER_COMPLETE` body:

```json
{
  "orderId": 47585,
  "feedbackType": "ORDER_COMPLETE",
  "rating": 9,
  "comments": "Reports arrived on time."
}
```

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | yes | Order id the feedback is about. Must be an order placed by your store. |  |  |
| `feedbackType` | string | yes | Which survey this feedback answers. Decides the rating range and the survey fields required; see the table above. | enum: `SAMPLE_COLLECTION`, `ORDER_COMPLETE` |  |
| `rating` | integer | yes | Whole number from 1 to 5 for SAMPLE_COLLECTION, and from 1 to 10 for ORDER_COMPLETE. |  |  |
| `phleboOnTime` | boolean | no | SAMPLE_COLLECTION only, and required for it. Whether the phlebotomist arrived on time. |  |  |
| `goodPhleboBehavior` | boolean | no | SAMPLE_COLLECTION only, and required for it. Whether the phlebotomist behaved professionally. |  |  |
| `easyBookingProcess` | boolean | no | SAMPLE_COLLECTION only, and required for it. Whether booking the test was easy. |  |  |
| `comments` | string | no | Optional. What the customer said, in their words. Up to 1000 characters. |  |  |

Example:
```json
{
  "orderId": 47585,
  "feedbackType": "SAMPLE_COLLECTION",
  "rating": 4,
  "phleboOnTime": false,
  "goodPhleboBehavior": true,
  "easyBookingProcess": true,
  "comments": "The phlebotomist arrived 20 minutes late but was very gentle."
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
| `feedback.orderId` | integer | no |  |  |  |
| `feedback.feedbackType` | string | no |  | enum: `SAMPLE_COLLECTION`, `ORDER_COMPLETE` |  |
| `feedback.rating` | integer | no |  |  |  |
| `feedback.maxRating` | integer | no | Highest rating on this feedbackType's scale: 5 for SAMPLE_COLLECTION, 10 for ORDER_COMPLETE. |  |  |
| `feedback.phleboOnTime` | boolean | no | Present for SAMPLE_COLLECTION only. |  |  |
| `feedback.goodPhleboBehavior` | boolean | no | Present for SAMPLE_COLLECTION only. |  |  |
| `feedback.easyBookingProcess` | boolean | no | Present for SAMPLE_COLLECTION only. |  |  |
| `feedback.comments` | string, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "feedback": {
    "orderId": 47585,
    "feedbackType": "SAMPLE_COLLECTION",
    "rating": 4,
    "maxRating": 5,
    "phleboOnTime": false,
    "goodPhleboBehavior": true,
    "easyBookingProcess": true,
    "comments": "The phlebotomist arrived 20 minutes late but was very gentle."
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

Order not found for this store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 not found"
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

### GET /api/v1.3/order/testWebhook

**Trigger a test order webhook**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Sends one order webhook for an existing order to your Diagnostics Webhook URL, so you can test the endpoint that receives it. The order itself is not changed. If your store has no Diagnostics Webhook URL, nothing is sent and the call still answers success.

The webhook carries the order as it is now, with `events` set to `[STATUS_CHANGED]`. Pass `orderStatus` to see the payload at another stage of the order. The status being sent shapes the payload as follows:

- PENDING, CREATED, ORDER_SCHEDULED, RESCHEDULED and the kit statuses (KIT_BOOKED, KIT_DISPATCHED, KIT_DELIVERED, KIT_PICKUP_BOOKED, KIT_PICKUP_IN_TRANSIT) send `phleboName` and `phleboNumber` as null.
- Every other status except CANCELED fills in a sample phlebotomist when the order has none. PHLEBO_STARTED also sets `phleboStartTime` to an hour before your call.
- Passing `orderStatus=RESCHEDULED` moves `appointmentTime` to 10:00 IST the next day.
- `reports` is empty for every status except REPORT_DELIVERED and CANCELED. REPORT_DELIVERED adds a sample report when the order has none, and its link downloads a sample PDF.

The payload is described under Webhook below. Webhooks sent for real changes to your orders have the same shape.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | string | yes | Id of the order to send a webhook for. The order is not changed. |  | "47585" |
| `orderStatus` | query | string | no | Optional. Order status to put in the webhook instead of the order's current status. | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_MISSED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `PHLEBO_NO_SHOW`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_REJECTED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED`, `RESCHEDULED`, `CANCELED` |  |

#### Responses

##### 200

Webhook triggered

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `message` | string | no |  |  |  |

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

No order with this id belongs to your store

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

#### Callback / webhook: `orderWebhook`

Target: `POST <your Diagnostics Webhook URL>`

**Order webhook, sent to your Diagnostics Webhook URL whenever one of your orders changes**

Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Sent as a POST with a JSON body. Answer with any 2xx status; the response body is ignored.

Every webhook carries your store's webhook authentication header, a header name and value agreed with LabStack: check it to confirm the webhook came from LabStack. Contact us to set or change it. Its value does not change when your API keys are rotated or revoked.

`events` lists everything that changed in the update, so one webhook can carry several events:

| Event | Sent when |
| --- | --- |
| `STATUS_CHANGED` | `orderStatus` changed. |
| `RESCHEDULED` | `appointmentTime` changed. |
| `REPORTS_CHANGED` | A report was added to, replaced in or removed from `reports`. |
| `PHLEBO_CHANGED` | A phlebotomist was assigned or replaced, so `phleboName` or `phleboNumber` changed. |
| `LAB_CHANGED` | The order moved to another lab. `labName`, `labLogo`, `lsLabId` and `lsChainId` describe the new lab. |
| `HARMONIZED_VALUES_CHANGED` | The order's standardized test values changed. Fetch them with getReportRawValues. |
| `PAYMENT_RECEIVED` | The payment the order was waiting for came through, and `isPaymentRequired` is now false. |

Every order reports the CREATED status. When an order moves past CREATED in a single step, you are first sent a STATUS_CHANGED webhook with `orderStatus` CREATED, then the one with its new status.

###### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | header | string | no | The webhook authentication header most stores receive, holding the webhook key agreed with LabStack for your store. If your store's authentication header has another name, that header is sent instead; if none is set up, webhooks carry no authentication header. |  |  |

###### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | no | Order id, as returned by placeOrder. |  |  |
| `events` | array<string> | no | What changed in this update. See the table above. | items: enum: `STATUS_CHANGED`, `RESCHEDULED`, `REPORTS_CHANGED`, `PHLEBO_CHANGED`, `LAB_CHANGED`, `HARMONIZED_VALUES_CHANGED`, `PAYMENT_RECEIVED` |  |
| `isVip` | boolean | no |  |  |  |
| `labName` | string | no |  |  |  |
| `labLogo` | string, nullable | no | Link to the lab logo; null when the lab has none. |  |  |
| `lsLabId` | integer | no |  |  |  |
| `lsChainId` | integer, nullable | no | Null if the lab is not part of a chain. |  |  |
| `orderType` | string | no | CAMP is an order from a health camp. SAMPLE_DROP_OFF is an order whose sample is picked up from your store or clinic. Neither is placed through placeOrder. | enum: `HOME_SAMPLE`, `CENTER_VISIT`, `CAMP`, `KIT_BASED`, `SAMPLE_DROP_OFF` |  |
| `orderStatus` | string | no | KIT_BOOKED, KIT_DISPATCHED, KIT_DELIVERED, KIT_PICKUP_BOOKED and KIT_PICKUP_IN_TRANSIT apply to KIT_BASED orders only: the courier taking the kit to the patient is booked, the kit is on its way, the kit has reached the patient, the return pickup is booked, and the kit is on its way back to the lab. A KIT_BASED order reports KIT_PICKUP_IN_TRANSIT where other orders report SAMPLE_IN_TRANSIT. SAMPLE_REJECTED means the lab could not test the sample; a new collection follows and moves the order on, or the order is cancelled. | enum: `PENDING`, `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_MISSED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `PHLEBO_NO_SHOW`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_REJECTED`, `SAMPLE_PROCESSED`, `PARTIAL_DELIVERED`, `REPORT_DELIVERED`, `RESCHEDULED`, `CANCELED` |  |
| `isPaymentRequired` | boolean | no | True while the order is waiting for the payment it was placed with. Turns false with the PAYMENT_RECEIVED event. |  |  |
| `appointmentTime` | string (date-time) | no | Scheduled collection or visit time, ISO 8601 in UTC. |  |  |
| `preparations` | array<string> | no | What the patient should do before the sample is collected, such as fasting. Empty when nothing is needed. |  |  |
| `referenceId` | string, nullable | no | The referenceId you gave when placing the order; empty or null if none. |  |  |
| `phleboName` | string, nullable | no | Empty or null until a phlebotomist is assigned. |  |  |
| `phleboNumber` | string, nullable | no | Empty or null until a phlebotomist is assigned. |  |  |
| `phleboStartTime` | string (date-time), nullable | no | When the phlebotomist set off for the collection, ISO 8601 in UTC; null until then. |  |  |
| `trackingLink` | string, nullable | no | Link to follow the phlebotomist on their way, for labs that offer one; null otherwise. |  |  |
| `name` | string | no | Patient name. |  |  |
| `email` | string, nullable | no |  |  |  |
| `mobile` | string, nullable | no |  |  |  |
| `altNumber` | string, nullable | no |  |  |  |
| `uniqueId` | string, nullable | no | Your id for the patient. |  |  |
| `relation` | string, nullable | no | How the patient is related to the main user, when the order is for a family member; null otherwise. | enum: `OTHER`, `HUSBAND`, `WIFE`, `FATHER`, `MOTHER`, `SON`, `DAUGHTER`, `GRANDFATHER`, `GRANDMOTHER`, `GRANDSON`, `GRANDDAUGHTER`, `SON_IN_LAW`, `DAUGHTER_IN_LAW`, `BROTHER`, `SISTER`, `BROTHER_IN_LAW`, `SISTER_IN_LAW`, `UNCLE`, `AUNT`, `COUSIN`, `NEPHEW`, `NIECE`, `MOTHER_IN_LAW`, `FATHER_IN_LAW`, `PARTNER`, `FRIEND`, `NEIGHBOUR` |  |
| `mainUserUniqueId` | string, nullable | no | uniqueId of the main user, when the order is for a family member; null otherwise. |  |  |
| `gender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `unitFloorBuilding` | string, nullable | no |  |  |  |
| `address` | string, nullable | no |  |  |  |
| `locality` | string, nullable | no |  |  |  |
| `city` | string, nullable | no |  |  |  |
| `state` | string, nullable | no |  |  |  |
| `pincode` | string, nullable | no |  |  |  |
| `latitude` | number, nullable | no |  |  |  |
| `longitude` | number, nullable | no |  |  |  |
| `labOrderId` | string | no | The order's id on the lab's system; empty until the lab assigns one. |  |  |
| `labUserId` | string | no | The patient's id on the lab's system, for labs that assign one; empty otherwise. |  |  |
| `dateOfBirth` | string | no | YYYY-MM-DD; empty when not known. |  |  |
| `packages` | array<object> | no |  |  |  |
| `packages[].lsId` | string | no | LS package id. |  |  |
| `packages[].name` | string | no |  |  |  |
| `tests` | array<object> | no |  |  |  |
| `tests[].lsId` | string | no | LS test id. |  |  |
| `tests[].name` | string | no |  |  |  |
| `tests[].sampleType` | string, nullable | no |  |  |  |
| `tests[].methodology` | string, nullable | no |  |  |  |
| `reports` | array<object> | no | Reports ready to download. Empty until the first report is ready. |  |  |
| `reports[].link` | string | no | Report PDF download link. Call it with your `ls-api-key` header. |  |  |
| `reports[].type` | string | no | PARTIAL while some of the results are still to come. | enum: `FULL`, `PARTIAL` |  |
| `cancelReason` | string | no | Reason given when the order was canceled; empty otherwise. |  |  |
| `notes` | string | no | The notes given when the order was placed; empty if none. |  |  |

Example:
```json
{
  "orderId": 47585,
  "events": [
    "STATUS_CHANGED",
    "REPORTS_CHANGED"
  ],
  "isVip": false,
  "labName": "Lab name 1",
  "labLogo": "https://www.example.com/lab-logo.png",
  "lsLabId": 57,
  "lsChainId": 3,
  "orderType": "HOME_SAMPLE",
  "orderStatus": "REPORT_DELIVERED",
  "isPaymentRequired": false,
  "appointmentTime": "2026-10-06T03:30:00.000Z",
  "preparations": [
    "Fasting for 10-12 hours"
  ],
  "referenceId": "P10012",
  "phleboName": "Ravi Kumar",
  "phleboNumber": "9876543210",
  "phleboStartTime": "2026-10-06T02:55:00.000Z",
  "trackingLink": null,
  "name": "Asha Rao",
  "email": "asha.rao@example.com",
  "mobile": "8047359194",
  "altNumber": null,
  "uniqueId": "U1234",
  "relation": null,
  "mainUserUniqueId": null,
  "gender": "FEMALE",
  "unitFloorBuilding": "2nd Floor Tower 3",
  "address": "123 Main Road",
  "locality": "Gopalapur",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560035",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "labOrderId": "BLR1234",
  "labUserId": "",
  "dateOfBirth": "1990-04-12",
  "packages": [
    {
      "lsId": "LSP10029",
      "name": "Full Body Checkup"
    }
  ],
  "tests": [
    {
      "lsId": "LSL110001",
      "name": "HbA1c",
      "sampleType": "Blood",
      "methodology": "HPLC"
    }
  ],
  "reports": [
    {
      "link": "https://console.labstack.in/api/v1.3/order/getReport?orderId=47585&reportId=0",
      "type": "FULL"
    }
  ],
  "cancelReason": "",
  "notes": ""
}
```

###### Responses

####### 200

Any 2xx status acknowledges the webhook. The response body is ignored.

---

### POST /api/v1.3/order/triggerOrderLifecycle

**Move a test order to a status (UAT only)**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Available only in the UAT environment; anywhere else it answers 403. Use it to test how your integration handles each stage of an order without waiting for a lab to act on it.

Moves one of your orders forward to `targetOrderStatus`, one status at a time. The call answers 202 straight away with `order.statusPath`: every status the order will pass through, starting with its current status. The first change is made right after the response and the rest follow `interval` seconds apart, so in the example below the order reaches PHLEBO_STARTED about 10 seconds after the call.

The changes are real. The order keeps each new status, and every change appears in its history as it would if a lab had made it.

#### Statuses by order type

Any status after PENDING in the order type's row is a valid `targetOrderStatus`. The order passes through every status between its current one and the target, in this order:

| orderType | Statuses, in order |
| --- | --- |
| `HOME_SAMPLE` | PENDING → CREATED → ORDER_SCHEDULED → PHLEBO_ASSIGNED → PHLEBO_STARTED → SAMPLE_COLLECTED → SAMPLE_IN_TRANSIT → SAMPLE_DELIVERED → SAMPLE_PROCESSED → REPORT_DELIVERED |
| `CENTER_VISIT` | PENDING → CREATED → ORDER_SCHEDULED → PATIENT_VISITED → SAMPLE_COLLECTED → SAMPLE_IN_TRANSIT → SAMPLE_DELIVERED → SAMPLE_PROCESSED → REPORT_DELIVERED |
| `KIT_BASED` | PENDING → CREATED → KIT_BOOKED → KIT_DISPATCHED → KIT_DELIVERED → SAMPLE_COLLECTED → KIT_PICKUP_BOOKED → KIT_PICKUP_IN_TRANSIT → SAMPLE_DELIVERED → SAMPLE_PROCESSED → REPORT_DELIVERED |
| `CAMP` | PENDING → CREATED → REPORT_DELIVERED |
| `SAMPLE_DROP_OFF` | PENDING → CREATED → ORDER_SCHEDULED → SAMPLE_COLLECTED → SAMPLE_DELIVERED → SAMPLE_PROCESSED → REPORT_DELIVERED |

An order whose status is not in its row continues from the next status in the row. A RESCHEDULED order moves to ORDER_SCHEDULED first (KIT_BOOKED for a kit order), and a PARTIAL_DELIVERED order moves to REPORT_DELIVERED.

#### Webhooks and messages

Each change sends your Diagnostics Webhook URL the same order webhook a real change would, with the payload described under Webhook in [Trigger a test order webhook](#get-api-v1-3-order-testWebhook). If your store has no Diagnostics Webhook URL, the order still moves but nothing is sent.

| Status reached | `events` in the webhook |
| --- | --- |
| Any status | `STATUS_CHANGED` |
| PHLEBO_ASSIGNED, when the order had no phlebotomist | `STATUS_CHANGED`, `PHLEBO_CHANGED` |
| REPORT_DELIVERED, when the order had no report | `STATUS_CHANGED`, `REPORTS_CHANGED` |

The patient messages your store has switched on for these statuses are sent too, and so is the report email if your store receives reports by email. Use patients whose contact details are your own.

#### Sample data

Where a status needs details the order does not have yet, sample values are written in the same change, so its webhook carries them. Details already on the order are kept.

| Status reached | Field | Sample value |
| --- | --- | --- |
| PHLEBO_ASSIGNED or PHLEBO_STARTED | `phleboName`, `phleboNumber` | `Dummy Phlebo`, `9876543210` |
| PHLEBO_STARTED | `phleboStartTime` | The time of the change |
| REPORT_DELIVERED | `reports` | One sample report, whose link downloads a sample PDF |

#### When the order cannot be moved

- A `targetOrderStatus` that is not in the order type's row, or that the order has already reached or passed, is rejected with 400.
- CANCELED, PATIENT_MISSED, PHLEBO_NO_SHOW and SAMPLE_REJECTED orders cannot be moved, and are rejected with 400.
- An order moves towards one target at a time. A second call for the same order answers 409 until the first has finished.
- If anything else changes the order's status while it is moving (a cancellation, say), the remaining changes are skipped and the order keeps the status it was given.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | yes | Id of the order to move, as returned by placeOrder. Must be one of your orders. |  |  |
| `targetOrderStatus` | string | yes | Status to move the order to. Must be in the row for the order's type in the table above, after the order's current status. | enum: `CREATED`, `ORDER_SCHEDULED`, `KIT_BOOKED`, `KIT_DISPATCHED`, `KIT_DELIVERED`, `PATIENT_VISITED`, `PHLEBO_ASSIGNED`, `PHLEBO_STARTED`, `SAMPLE_COLLECTED`, `KIT_PICKUP_BOOKED`, `KIT_PICKUP_IN_TRANSIT`, `SAMPLE_IN_TRANSIT`, `SAMPLE_DELIVERED`, `SAMPLE_PROCESSED`, `REPORT_DELIVERED` |  |
| `interval` | integer | no | Optional. Seconds between one status change and the next: a whole number from 2 to 60. Defaults to 5. |  |  |

Example:
```json
{
  "orderId": 47585,
  "targetOrderStatus": "PHLEBO_STARTED",
  "interval": 5
}
```

#### Responses

##### 202

The order has started moving. Its webhooks follow.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `message` | string | no |  |  |  |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.orderType` | string | no |  | enum: `HOME_SAMPLE`, `CENTER_VISIT`, `CAMP`, `KIT_BASED`, `SAMPLE_DROP_OFF` |  |
| `order.orderStatus` | string | no | The order status when you called. Also the first entry of statusPath. |  |  |
| `order.targetOrderStatus` | string | no | The targetOrderStatus you sent. Also the last entry of statusPath. |  |  |
| `order.statusPath` | array<string> | no | Every status the order will pass through, in order: its current status, then each status it will be moved to, ending with targetOrderStatus. Expect one webhook for each entry after the first. |  |  |
| `order.interval` | integer | no | Seconds between status changes: the interval you sent, or 5. |  |  |

Example:
```json
{
  "status": "success",
  "message": "Order is moving to PHLEBO_STARTED",
  "order": {
    "orderId": 47585,
    "orderType": "HOME_SAMPLE",
    "orderStatus": "CREATED",
    "targetOrderStatus": "PHLEBO_STARTED",
    "statusPath": [
      "CREATED",
      "ORDER_SCHEDULED",
      "PHLEBO_ASSIGNED",
      "PHLEBO_STARTED"
    ],
    "interval": 5
  }
}
```

##### 400

The order cannot be moved as asked, and error says why. Returned when the body is not a JSON object; when orderId, targetOrderStatus or interval is missing or invalid; when targetOrderStatus is not in the row for the order's type (error lists the allowed values); when the order has already reached or passed targetOrderStatus; and when the order is CANCELED, PATIENT_MISSED, PHLEBO_NO_SHOW or SAMPLE_REJECTED.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "targetOrderStatus PHLEBO_ASSIGNED is not available for KIT_BASED orders. Allowed values: CREATED, KIT_BOOKED, KIT_DISPATCHED, KIT_DELIVERED, SAMPLE_COLLECTED, KIT_PICKUP_BOOKED, KIT_PICKUP_IN_TRANSIT, SAMPLE_DELIVERED, SAMPLE_PROCESSED, REPORT_DELIVERED"
}
```

##### 401 (`Unauthorized`)

Unauthorized — API key missing, invalid, expired or revoked

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

##### 403

Not available in this environment. The API runs only in the UAT environment.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "This API is available only in the UAT environment"
}
```

##### 404

No order with this id belongs to your store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 not found"
}
```

##### 409

The order is already moving towards a target. Call again once it has finished.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 is already moving to another status. Try again once it has finished"
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

##### 503

Order webhooks are switched off in this environment, so the API cannot run. Contact LabStack.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order status webhooks are not enabled in this environment, so this API is unavailable"
}
```

---

### POST /api/v1.3/order/updateOrder

**Update an order**

Tag: Order · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Updates the identifiers you gave an existing order. Send orderId plus at least one of referenceId and uniqueId; anything you omit is left unchanged. referenceId replaces your own reference on the order, and an empty string clears it. uniqueId renames the patient this order belongs to — the patient record itself, so the new uniqueId is what every other order and appointment of theirs reports too. It is rejected with 400 if any other patient of yours already uses that uniqueId — including when the order's own patient already has it, so the same call run twice fails the second time — and with 400 when the patient on the order is not one of yours to rename. Both changes are recorded against the order and are visible to LabStack support.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | yes | Order id to update. Must be an order placed by your store. |  |  |
| `referenceId` | string | no | Optional. Your own reference id for this order; echoed back in responses and webhooks. Up to 100 characters. Pass an empty string to clear it. |  |  |
| `uniqueId` | string | no | Optional. The new uniqueId for the order's patient. Up to 100 characters, and must not already be in use by another of your patients. |  |  |

Example:
```json
{
  "orderId": 47585,
  "referenceId": "REF-123",
  "uniqueId": "U1234"
}
```

#### Responses

##### 200

Order updated

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.referenceId` | string, nullable | no | The reference id after the update. |  |  |
| `order.uniqueId` | string, nullable | no | The patient's uniqueId after the update. |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 47585,
    "referenceId": "REF-123",
    "uniqueId": "U1234"
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

Order not found for this store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |

Example:
```json
{
  "status": "failure",
  "error": "Order 47585 not found"
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

---

## Request

### GET /api/v1.3/request/linkToOrder

**Link a request to an order**

Tag: Request · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Ties an existing request to an order that has already been placed. This GET has side effects: on success the request is marked as converted and permanently associated with that order. Both ids must belong to your store, otherwise the call reports that nothing was found. A request can be linked only once, and an order can be linked to only one request - attempting either again fails with a 400 that says so.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `requestId` | query | string | yes | Id of the request to link, as returned by Place a request. Positive integer. |  | "8421" |
| `orderId` | query | string | yes | Id of the order to link the request to, as returned by Place a lab order. Positive integer. |  | "47585" |

#### Responses

##### 200

Request linked to the order

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `message` | string | no | Confirms which request was linked to which order. |  |  |

Example:
```json
{
  "status": "success",
  "message": "Request (Id: 8421) successfully linked to Order (Id: 47585)"
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

No request, or no order, found for the given id in your store

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  | "No request found for the given requestId" |

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

The link could not be saved. Nothing was changed, and the call can be retried.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  | "Unknown error - Failed to link the request to the order" |

---

### POST /api/v1.3/request/placeRequest

**Place a request**

Tag: Request · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates a request - an enquiry raised against the authenticated store, not an order. Use it when a customer has shown interest but the booking is not yet confirmed: the request is followed up, the details and pricing are settled, and once the order has been placed the two are tied together with Link a request to an order. Only name and mobile are required. Any packages and tests given must be part of your store network, and an optional labId pins the request to a single lab, which must support every package and test given as well as the requested orderType.
If the customer has already paid your store for this request, give the amount in amountPaidToStore. The order booked from the request is then set up by default for your store to collect payment from the customer.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderType` | string | no | Optional. Type of service the customer is interested in. | enum: `HOME_SAMPLE`, `CENTER_VISIT`, `KIT_BASED` |  |
| `isVip` | boolean | no | Optional. Marks the request as VIP. Defaults to false. |  |  |
| `referenceId` | string | no | Optional. Your own reference id, echoed back on the request. |  |  |
| `requestGroupId` | string | no | Optional. Your own grouping key, to tie several requests raised together into one batch. |  |  |
| `packageIds` | array<string> | no | Optional. LS package ids the customer is interested in (e.g. LSP11002). Each must be active and part of your store network, and must support orderType when one is given. |  |  |
| `testIds` | array<string> | no | Optional. LS test ids the customer is interested in (e.g. LSL110001). |  |  |
| `appointment` | string | no | Optional. Preferred appointment date-time, ISO 8601 format. Must be in the future. |  | "2026-06-01T11:00:00+05:30" |
| `labId` | integer | no | Optional. Preferred lab, as returned by List labs. Must be in your store network, support the requested orderType, and carry every package and test given. |  |  |
| `notes` | string | no | Optional. Free-text notes for the request (e.g. "Patient is old, veins are thin"). |  |  |
| `referredBy` | string | no | Optional. Who referred the customer. |  |  |
| `amountPaidToStore` | number | no | Optional. Amount in INR the customer has already paid your store for this request, as a number of 0 or more. Omit it, or send 0, when nothing was paid. When it is above 0, the order booked from the request is set up by default for your store to collect payment from the customer. |  | 1499 |
| `name` | string | yes | Customer name. Sanitised to alphanumerics and spaces; must be non-empty after sanitisation and at most 50 characters. |  |  |
| `mobile` | string | yes | 10 digits, cannot start with 0. |  |  |
| `email` | string | no | Optional. Customer email address. |  |  |
| `dateOfBirth` | string | no | Optional. YYYY-MM-DD. Cannot be in the future. Takes precedence over age when both are given. |  |  |
| `age` | integer | no | Optional. Customer age in whole years, used to derive an approximate date of birth. Read only when dateOfBirth is omitted. |  |  |
| `gender` | string | no | Optional. Customer gender. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `altContact` | string | no | Optional. Alternate contact number. 10 digits, cannot start with 0. |  |  |
| `unitFloorBuilding` | string | no | Optional. Part of the customer address. |  |  |
| `address` | string | no | Optional. Part of the customer address. |  |  |
| `locality` | string | no | Optional. Part of the customer address. |  |  |
| `city` | string | no | Optional. Part of the customer address. |  |  |
| `state` | string | no | Optional. Part of the customer address. |  |  |
| `pincode` | string | no | Optional. 6 digits. |  |  |

Example:
```json
{
  "orderType": "HOME_SAMPLE",
  "isVip": false,
  "referenceId": "REF-123",
  "requestGroupId": "GRP-9",
  "packageIds": [
    "LSP11002",
    "LSP11004"
  ],
  "testIds": [
    "LSL110001"
  ],
  "appointment": "2026-06-01T11:00:00+05:30",
  "labId": 57,
  "notes": "Customer asked for an early morning slot.",
  "referredBy": "Dr. Rao",
  "amountPaidToStore": 1499,
  "name": "Bob Smith",
  "mobile": "8047359194",
  "email": "bobsmith@example.com",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "altContact": "8047359195",
  "unitFloorBuilding": "2nd Floor Tower 3",
  "address": "123 Main Road",
  "locality": "Gopalapur",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560035"
}
```

#### Responses

##### 200

Request created

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success`, `failure` | "success" |
| `request` | object | no |  |  |  |
| `request.requestId` | integer | no | Id of the created request. Pass this to Link a request to an order once the order exists. |  |  |
| `request.requestStatus` | string | no | Always OPEN for a newly created request. | enum: `OPEN` |  |

Example:
```json
{
  "status": "success",
  "request": {
    "requestId": 8421,
    "requestStatus": "OPEN"
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

