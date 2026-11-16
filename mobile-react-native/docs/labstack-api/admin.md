# Admins API (LabStack) v1.0.0

Source: https://integration.labstack.in/api-docs/admin (OpenAPI 3.0.0 spec embedded in the page). Raw spec: [`raw/admin.openapi.json`](raw/admin.openapi.json). Generated from that file without editing any wording; descriptions are copied verbatim.

## Overview

API for managing your account — updating the details on record for a user you have booked. Every call must include a valid `ls-api-key` header.

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

- [POST /api/admin/v1.0/user/updateUserDetails](#post-apiadminv10userupdateuserdetails): Update a user's gender and date of birth

## User

### POST /api/admin/v1.0/user/updateUserDetails

**Update a user's gender and date of birth**

Tag: User · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Updates the gender and/or date of birth on record for an existing user, identified by the uniqueId they were booked with. uniqueId is required, and so is at least one of gender, dateOfBirth or age; when both dateOfBirth and age are given, dateOfBirth is used.
Only what you send is changed: a gender or date of birth you leave out stays as it is on record, and other user details are not changed. **Bookings and orders already placed for the user are not updated: one still in progress keeps the gender and date of birth it was placed with.**
The response returns the user's name, gender, date of birth and age as now on record; a gender, date of birth or age with nothing on record is null.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `uniqueId` | string | yes | The user's unique id, as used when booking. |  |  |
| `gender` | string | no | At least one of gender, dateOfBirth or age is required. | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `dateOfBirth` | string (date) | no | At least one of gender, dateOfBirth or age is required. Cannot be in the future. Used instead of age when both are given. |  |  |
| `age` | integer | no | At least one of gender, dateOfBirth or age is required. Whole years. |  |  |

Example:
```json
{
  "uniqueId": "CUST-10442",
  "gender": "FEMALE",
  "dateOfBirth": "1990-05-01"
}
```

#### Responses

##### 200

User details updated

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "success" |
| `user` | object | no |  |  |  |
| `user.uniqueId` | string | no |  |  |  |
| `user.name` | string | no | The user's name as on record. This call does not change it. |  |  |
| `user.gender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `user.dateOfBirth` | string (date), nullable | no |  |  |  |
| `user.age` | integer, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "user": {
    "uniqueId": "CUST-10442",
    "name": "Priya Sharma",
    "gender": "FEMALE",
    "dateOfBirth": "1990-05-01",
    "age": 36
  }
}
```

##### 400 (`BadRequest`)

uniqueId is missing, none of gender, dateOfBirth or age is given, or a value given is invalid

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

No user with this uniqueId on your account

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

