# Pharmacy API (LabStack) v1.2.0

Source: https://integration.labstack.in/api-docs/pharma (OpenAPI 3.0.0 spec embedded in the page). Raw spec: [`raw/pharma.openapi.json`](raw/pharma.openapi.json). Generated from that file without editing any wording; descriptions are copied verbatim.

## Overview

API for ordering medicines from your pharmacy network — serviceability, catalogue search and prices, estimates, orders, prescriptions and cancellation. Every call must include a valid `ls-api-key` header, and every change to an order is sent to your pharmacy webhook.

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

- [GET /api/pharma/v1.0/catalog/getAlternatives](#get-apipharmav10cataloggetalternatives): Get alternatives
- [GET /api/pharma/v1.0/catalog/getDrugDetails](#get-apipharmav10cataloggetdrugdetails): Get drug details
- [GET /api/pharma/v1.0/catalog/searchDrugs](#get-apipharmav10catalogsearchdrugs): Search drugs
- [POST /api/pharma/v1.0/order/cancelOrder](#post-apipharmav10ordercancelorder): Cancel order
- [POST /api/pharma/v1.0/order/getEstimate](#post-apipharmav10ordergetestimate): Get estimate
- [GET /api/pharma/v1.0/order/getOrderDetails](#get-apipharmav10ordergetorderdetails): Get order details
- [POST /api/pharma/v1.0/order/placeOrder](#post-apipharmav10orderplaceorder): Place order
- [POST /api/pharma/v1.0/order/uploadPrescription](#post-apipharmav10orderuploadprescription): Upload prescription
- [GET /api/pharma/v1.0/network/checkServiceability](#get-apipharmav10networkcheckserviceability): Check serviceability

## Catalog

### GET /api/pharma/v1.0/catalog/getAlternatives

**Get alternatives**

Tag: Catalog · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Other drugs with the same salt composition as `drugMasterId` - other brands and packs of the same medicine - that your pharmacy network lists, by name, in the same shape as Search Drugs. Send `lsPharmacyId` to find alternatives one pharmacy stocks, for example to replace a drug Get Estimate reports unavailable there. `drug` is the drug you asked about, with its own listings. An order is never substituted automatically: only the drugMasterIds you send to Place Order are ordered, so an alternative has to be ordered explicitly. A drug with no salt composition on record has no alternatives. An alternative with `notForSale: true` - a Schedule X or habit-forming drug - cannot be ordered online either.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `drugMasterId` | query | string | yes | The drug to find alternatives for |  | "LSD100001" |
| `lsPharmacyId` | query | integer | no | Optional. Only alternatives this network pharmacy lists. |  | "456" |
| `page` | query | integer | no | Optional. 1-based. Default 1. A page past totalPages is a 400. | minimum: `1` | "1" |
| `pageSize` | query | integer | no | Optional. Default 20, at most 100. | minimum: `1`; maximum: `100` | "20" |

#### Responses

##### 200

The drug and a page of its alternatives

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `drug` | object | no | The drug asked about, in the Search Drugs shape |  |  |
| `count` | integer | no | Alternatives across all pages |  |  |
| `page` | integer | no |  |  |  |
| `pageSize` | integer | no |  |  |  |
| `totalPages` | integer | no |  |  |  |
| `alternatives` | array<object> | no | Drugs in the Search Drugs shape |  |  |

Example:
```json
{
  "status": "success",
  "drug": {
    "drugMasterId": "LSD100001",
    "name": "Crocin 500 Tablet",
    "saltCompositionId": "SALT00045",
    "saltCompositionName": "Paracetamol 500mg",
    "prescriptionRequired": false,
    "notForSale": false,
    "packContainer": "strip",
    "packQty": 15,
    "packUnit": null,
    "pharmacies": [
      {
        "lsPharmacyId": 456,
        "pharmacyName": "City Health Pharmacy",
        "mrp": 32,
        "customerPrice": 28.8,
        "storePrice": 27.2
      }
    ]
  },
  "count": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "alternatives": [
    {
      "drugMasterId": "LSD100045",
      "name": "Dolo 500 Tablet",
      "saltCompositionId": "SALT00045",
      "saltCompositionName": "Paracetamol 500mg",
      "prescriptionRequired": false,
      "notForSale": false,
      "packContainer": "strip",
      "packQty": 10,
      "packUnit": null,
      "pharmacies": [
        {
          "lsPharmacyId": 456,
          "pharmacyName": "City Health Pharmacy",
          "mrp": 30,
          "customerPrice": 27,
          "storePrice": 25.5
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

##### 404

No such drug in the catalogue

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Drug LSD100001 not found"
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

### GET /api/pharma/v1.0/catalog/getDrugDetails

**Get drug details**

Tag: Catalog · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

One drug, in the same shape Search Drugs returns: its salt composition, whether a prescription is required, its pack, and each network pharmacy that lists it with the MRP, customer price and your store's price there, cheapest to the customer first. Send `lsPharmacyId` for one pharmacy's listing only. A drug your network does not list comes back with an empty `pharmacies`. Prices are from the catalogue and listing is not live stock; Get Estimate gives the live price and stock for a basket. A drug that cannot be sold online - a Schedule X or habit-forming drug - is returned with `notForSale: true` and `prescriptionRequired: true`, so its details can be shown; Get Estimate and Place Order reject a basket that contains it.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `drugMasterId` | query | string | yes | LabStack drug id |  | "LSD100001" |
| `lsPharmacyId` | query | integer | no | Optional. Only this network pharmacy's listing. |  | "456" |

#### Responses

##### 200

The drug and its listings in your network

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `drug` | object | no |  |  |  |
| `drug.drugMasterId` | string | no |  |  |  |
| `drug.name` | string | no |  |  |  |
| `drug.saltCompositionId` | string, nullable | no |  |  |  |
| `drug.saltCompositionName` | string, nullable | no |  |  |  |
| `drug.prescriptionRequired` | boolean | no | True when a prescription must be sent with the order, or when that is unconfirmed. Always true when notForSale is. |  |  |
| `drug.notForSale` | boolean | no | True for a Schedule X or habit-forming drug, which cannot be ordered online. Get Estimate and Place Order reject it. |  |  |
| `drug.packContainer` | string, nullable | no | What the pack is, e.g. strip, bottle, vial. The same at every pharmacy. |  |  |
| `drug.packQty` | number, nullable | no | How much the pack holds, counted in packUnit - or in units of the dosage form (tablets, capsules) when packUnit is null. |  |  |
| `drug.packUnit` | string, nullable | no | Unit of packQty, e.g. ml, gm. Null when packQty is a count. |  |  |
| `drug.pharmacies` | array<object> | no | Cheapest to the customer first |  |  |
| `drug.pharmacies[].lsPharmacyId` | integer | no |  |  |  |
| `drug.pharmacies[].pharmacyName` | string | no |  |  |  |
| `drug.pharmacies[].mrp` | number, nullable | no |  |  |  |
| `drug.pharmacies[].customerPrice` | number, nullable | no | mrp less your store's customer medicine discount |  |  |
| `drug.pharmacies[].storePrice` | number, nullable | no | What your store owes LabStack per pack: mrp less your store's own medicine discount |  |  |

Example:
```json
{
  "status": "success",
  "drug": {
    "drugMasterId": "LSD100001",
    "name": "Azithral 500 Tablet",
    "saltCompositionId": "SALT00112",
    "saltCompositionName": "Azithromycin 500mg",
    "prescriptionRequired": true,
    "notForSale": false,
    "packContainer": "strip",
    "packQty": 5,
    "packUnit": null,
    "pharmacies": [
      {
        "lsPharmacyId": 456,
        "pharmacyName": "City Health Pharmacy",
        "mrp": 120,
        "customerPrice": 108,
        "storePrice": 102
      },
      {
        "lsPharmacyId": 457,
        "pharmacyName": "MG Road Chemist",
        "mrp": 125,
        "customerPrice": 112.5,
        "storePrice": 106.25
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

No such drug in the catalogue

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Drug LSD100001 not found"
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

### GET /api/pharma/v1.0/catalog/searchDrugs

**Search drugs**

Tag: Catalog · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Pages through the drugs your pharmacy network lists, by name. Send `query` to search by brand or salt name; omit it to page through the whole catalogue. Send `lsPharmacyId` to list one pharmacy's drugs only. Each drug is one row with its pack - `packContainer`, `packQty` and `packUnit`, which are the drug's own and the same at every pharmacy - and `pharmacies`: every network pharmacy that lists it, with its MRP there, `customerPrice` - what the customer pays, the MRP less your store's customer medicine discount - and `storePrice` - what your store owes LabStack, the MRP less your store's own medicine discount. `count` and `totalPages` count drugs, not pharmacy listings. Prices here are from the catalogue; Get Estimate gives the live price and stock for a basket. `prescriptionRequired` is true when a prescription must be sent with an order containing the drug, and also when that is not confirmed either way - treat true as "collect a prescription". Drugs that cannot be sold online - Schedule X and habit-forming drugs - are listed so their details can be shown, with `notForSale: true` and `prescriptionRequired: true`. Get Estimate and Place Order reject a basket that contains one.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `query` | query | string | no | Optional. Brand or salt name to search for. At least 3 characters when sent. | minLength: `3` | "paracetamol" |
| `lsPharmacyId` | query | integer | no | Optional. Only drugs this network pharmacy lists. |  | "456" |
| `page` | query | integer | no | Optional. 1-based. Default 1. A page past totalPages is a 400. | minimum: `1` | "1" |
| `pageSize` | query | integer | no | Optional. Drugs per page. Default 20, at most 100. | minimum: `1`; maximum: `100` | "20" |

#### Responses

##### 200

A page of drugs

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `count` | integer | no | Drugs matching, across all pages |  |  |
| `page` | integer | no |  |  |  |
| `pageSize` | integer | no |  |  |  |
| `totalPages` | integer | no |  |  |  |
| `drugs` | array<object> | no |  |  |  |
| `drugs[].drugMasterId` | string | no | LabStack drug id. Identifies a brand and pack, not a salt. |  | "LSD100001" |
| `drugs[].name` | string | no |  |  |  |
| `drugs[].saltCompositionId` | string, nullable | no |  |  |  |
| `drugs[].saltCompositionName` | string, nullable | no |  |  |  |
| `drugs[].prescriptionRequired` | boolean | no | True when a prescription must be sent with the order, or when that is unconfirmed. Always true when notForSale is. |  |  |
| `drugs[].notForSale` | boolean | no | True for a Schedule X or habit-forming drug, which cannot be ordered online. Get Estimate and Place Order reject it. |  |  |
| `drugs[].packContainer` | string, nullable | no | What the pack is, e.g. strip, bottle, vial |  |  |
| `drugs[].packQty` | number, nullable | no | How much the pack holds, counted in packUnit - or in units of the dosage form (tablets, capsules) when packUnit is null. |  |  |
| `drugs[].packUnit` | string, nullable | no | Unit of packQty, e.g. ml, gm. Null when packQty is a count. |  |  |
| `drugs[].pharmacies` | array<object> | no | Network pharmacies listing the drug, cheapest to the customer first |  |  |
| `drugs[].pharmacies[].lsPharmacyId` | integer | no |  |  |  |
| `drugs[].pharmacies[].pharmacyName` | string | no |  |  |  |
| `drugs[].pharmacies[].mrp` | number, nullable | no | MRP per pack. Null when none is on record. |  |  |
| `drugs[].pharmacies[].customerPrice` | number, nullable | no | Customer price per pack: mrp less your store's customer medicine discount |  |  |
| `drugs[].pharmacies[].storePrice` | number, nullable | no | Your store's price per pack, what your store owes LabStack: mrp less your store's own medicine discount |  |  |

Example:
```json
{
  "status": "success",
  "count": 2,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "drugs": [
    {
      "drugMasterId": "LSD100001",
      "name": "Paracetamol 500mg Tablet",
      "saltCompositionId": "SALT00045",
      "saltCompositionName": "Paracetamol 500mg",
      "prescriptionRequired": false,
      "notForSale": false,
      "packContainer": "strip",
      "packQty": 10,
      "packUnit": null,
      "pharmacies": [
        {
          "lsPharmacyId": 456,
          "pharmacyName": "City Health Pharmacy",
          "mrp": 30,
          "customerPrice": 27,
          "storePrice": 25.5
        },
        {
          "lsPharmacyId": 457,
          "pharmacyName": "MG Road Chemist",
          "mrp": 32,
          "customerPrice": 28.8,
          "storePrice": 27.2
        }
      ]
    },
    {
      "drugMasterId": "LSD100002",
      "name": "Paracetamol 650mg Tablet",
      "saltCompositionId": "SALT00046",
      "saltCompositionName": "Paracetamol 650mg",
      "prescriptionRequired": false,
      "notForSale": false,
      "packContainer": "strip",
      "packQty": 15,
      "packUnit": null,
      "pharmacies": [
        {
          "lsPharmacyId": 456,
          "pharmacyName": "City Health Pharmacy",
          "mrp": 34,
          "customerPrice": 30.6,
          "storePrice": 28.9
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

## Orders

### POST /api/pharma/v1.0/order/cancelOrder

**Cancel order**

Tag: Orders · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Cancels one of your orders, by `orderId` or `referenceId`. An order the pharmacy has not received yet - waiting for payment, or not accepted automatically - is cancelled at once. Otherwise the pharmacy is asked, and may refuse once it has started on the order; a refusal is a 409, the order keeps its status, and LabStack follows it up with the pharmacy. Cancelling an order that is already CANCELLED succeeds and changes nothing, so a retry is safe. A FULL_DELIVERED or PARTIAL_DELIVERED order cannot be cancelled (409). For an order the pharmacy split into several fulfilments, cancelling any one cancels the whole order; `relatedOrders` reports where each of the others ended up, since a fulfilment the pharmacy had already accepted is left with it. A cancelled order's referenceId can be used again with Place Order. Money already paid through the order's payment link is owed back, and LabStack arranges the refund.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | no | LabStack order id. Send this or referenceId. |  | 1234 |
| `referenceId` | string | no | Your own order id. Send this or orderId. |  | "MY-REF-001" |
| `reason` | string | no | Optional. Recorded as the cancelReason. | maxLength: `500` | "Patient no longer needs the medication" |

Example:
```json
{
  "orderId": 1234,
  "reason": "Patient no longer needs the medication"
}
```

#### Responses

##### 200

The order is cancelled

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.referenceId` | string, nullable | no |  |  |  |
| `order.orderStatus` | string | no |  |  | "CANCELLED" |
| `order.cancelReason` | string, nullable | no |  |  |  |
| `order.pharmaSuperOrderId` | integer, nullable | no |  |  |  |
| `order.relatedOrders` | array<object> | no | The other fulfilments of a split order, with their status after the cancellation. Empty otherwise. |  |  |
| `order.relatedOrders[].orderId` | integer | no |  |  |  |
| `order.relatedOrders[].orderStatus` | string | no |  |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 1234,
    "referenceId": "MY-REF-001",
    "orderStatus": "CANCELLED",
    "cancelReason": "Patient no longer needs the medication",
    "pharmaSuperOrderId": null,
    "relatedOrders": []
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

No such order among yours

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Order 1234 not found"
}
```

##### 409

The order is delivered, is already being cancelled, or the pharmacy refused the cancellation

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "The pharmacy could not cancel this order at its current stage. LabStack has been alerted and will follow it up with the pharmacy."
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

### POST /api/pharma/v1.0/order/getEstimate

**Get estimate**

Tag: Orders · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Prices a basket at a pharmacy before any order exists, for partners that show a total or collect payment on their own platform. The basket is checked exactly as Place Order checks it - your network, the order type, the drugs the pharmacy lists, drugs that are not for sale, the location and the shipment speed - so a basket accepted here is accepted there unless stock or prices change in between. A basket containing a drug marked `notForSale` (Schedule X or habit-forming) is rejected with a 400 naming it. `unitPrice`, `subTotal` and `totalAmount` are what the customer pays: each drug's MRP less your store's customer medicine discount, plus `additionalCharges` - delivery and every other fee - on top. `storeUnitPrice`, `storeSubTotal` and `storeTotalAmount` are what your store owes LabStack: each drug's MRP less your store's own medicine discount, plus the same `additionalCharges`. Both totals are the figures Place Order fixes for the order if nothing changes; re-read them from Place Order's response. `allItemsAvailable` is false when the pharmacy cannot supply a drug, or not in the quantity asked; Place Order refuses that basket, and the item's `available` says which. Unavailable items are priced but left out of `subTotal` and `totalAmount`. `prescriptionRequired` is true when Place Order will need a prescription in `documents`. `canCollectPayment` is true when Place Order will accept `isPaymentRequired` for this basket. `isLivePrice` is false for a pharmacy that prices from its catalogue, whose stock is confirmed only once it receives the order. Location: send the patient's `pincode` or a `latitude`/`longitude` pair, for either order type. PICKUP is accepted on the rules Check Serviceability applies: the pharmacy's pickup point must be within `range` km of that location (10 unless sent, at most 100), or the call is a 400 giving the distance. `distance` and `pickupLocation` then say how far away the pickup point is and where the customer collects the order; both are null for HOME_DELIVERY, and for a pharmacy that chooses the pickup point when the order is placed.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderType` | string | yes |  | enum: `HOME_DELIVERY`, `PICKUP` | "HOME_DELIVERY" |
| `lsPharmacyId` | integer | yes | A pharmacy from Check Serviceability |  | 456 |
| `drugs` | array<object> | yes | One entry per drug. Repeated drugMasterIds are merged; at most 100 of any one drug. | minItems: `1`; maxItems: `50` |  |
| `drugs[].drugMasterId` | string | yes |  |  | "LSD100001" |
| `drugs[].quantity` | integer | yes |  | minimum: `1`; maximum: `100` | 2 |
| `pincode` | string | no | The patient's pincode - the delivery pincode for HOME_DELIVERY. Required unless latitude and longitude are sent. |  | "560001" |
| `latitude` | number | no | Optional. Send with longitude. The patient's location when sent: the delivery point, or where a PICKUP distance is measured from. |  | 12.9716 |
| `longitude` | number | no |  |  | 77.5946 |
| `range` | number | no | Optional, PICKUP only. How far, in km, the pickup point may be from the patient. Greater than 0 and at most 100. Default 10. |  |  |
| `unitFloorBuilding` | string | no | Optional. Refines the location. Requires pincode. |  |  |
| `address` | string | no | Optional. Refines the location. Requires pincode. |  | "42, MG Road" |
| `locality` | string | no | Optional. Requires pincode. |  | "Indiranagar" |
| `city` | string | no | Optional. Requires pincode. |  | "Bangalore" |
| `state` | string | no | Optional. Requires pincode. |  | "Karnataka" |
| `shipmentSpeed` | string | no | Optional. One of the pharmacy's shipmentSpeeds from Check Serviceability. Omit for its default. | enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `name` | string | no | Optional patient name. Send with mobile; some pharmacies quote more precisely with both. |  | "Jane Doe" |
| `mobile` | string | no | Optional patient mobile. Send with name. |  | "9876543210" |

Example:
```json
{
  "orderType": "HOME_DELIVERY",
  "lsPharmacyId": 456,
  "drugs": [
    {
      "drugMasterId": "LSD100001",
      "quantity": 2
    },
    {
      "drugMasterId": "LSD100002",
      "quantity": 1
    }
  ],
  "pincode": "560001",
  "address": "42, MG Road",
  "city": "Bangalore",
  "state": "Karnataka",
  "shipmentSpeed": "STANDARD"
}
```

#### Responses

##### 200

The estimate

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `estimate` | object | no |  |  |  |
| `estimate.lsPharmacyId` | integer | no |  |  |  |
| `estimate.pharmacyName` | string | no |  |  |  |
| `estimate.orderType` | string | no |  | enum: `HOME_DELIVERY`, `PICKUP` |  |
| `estimate.shipmentSpeed` | string, nullable | no | The speed quoted; null for the pharmacy default | enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `estimate.shipmentSpeeds` | array<string> | no | Speeds the pharmacy offers at this location. Empty when it offers no choice. |  |  |
| `estimate.distance` | number, nullable | no | PICKUP only: km from the patient to the pickup point, to 2 decimal places. Null otherwise. |  |  |
| `estimate.pickupLocation` | object, nullable | no | PICKUP only: where the customer collects the order. Null exactly when distance is. |  |  |
| `estimate.pickupLocation.address` | string, nullable | no |  |  |  |
| `estimate.pickupLocation.locality` | string, nullable | no |  |  |  |
| `estimate.pickupLocation.city` | string, nullable | no |  |  |  |
| `estimate.pickupLocation.state` | string, nullable | no |  |  |  |
| `estimate.pickupLocation.pincode` | string, nullable | no |  |  |  |
| `estimate.pickupLocation.latitude` | number | no |  |  |  |
| `estimate.pickupLocation.longitude` | number | no |  |  |  |
| `estimate.pickupLocation.openingTime` | string, nullable | no | HH:mm, India time, the same every day. Null together with closingTime when the pharmacy is open 24 hours. |  |  |
| `estimate.pickupLocation.closingTime` | string, nullable | no | HH:mm, India time. |  |  |
| `estimate.isLivePrice` | boolean | no | True when the pharmacy priced the basket and confirmed its stock just now |  |  |
| `estimate.allItemsAvailable` | boolean | no | False when Place Order would refuse the basket for stock |  |  |
| `estimate.prescriptionRequired` | boolean | no | True when Place Order needs a prescription in documents |  |  |
| `estimate.canCollectPayment` | boolean | no | True when Place Order accepts isPaymentRequired for this basket |  |  |
| `estimate.price` | object | no |  |  |  |
| `estimate.price.currency` | string | no |  |  | "INR" |
| `estimate.price.mrpTotal` | number, nullable | no | MRP x quantity over the available items. Null when any of them has no MRP on record. |  |  |
| `estimate.price.subTotal` | number | no | The available items at the customer price |  |  |
| `estimate.price.additionalCharges` | number | no | Delivery and every other fee on top of the medicines |  |  |
| `estimate.price.totalAmount` | number | no | subTotal + additionalCharges |  |  |
| `estimate.price.storeSubTotal` | number, nullable | no | The medicines at your store's price |  |  |
| `estimate.price.storeTotalAmount` | number, nullable | no | What your store owes LabStack: storeSubTotal + additionalCharges |  |  |
| `estimate.price.items` | array<object> | no |  |  |  |
| `estimate.price.items[].drugMasterId` | string | no |  |  |  |
| `estimate.price.items[].name` | string | no |  |  |  |
| `estimate.price.items[].packContainer` | string, nullable | no | What the pack is, e.g. strip, bottle, vial |  |  |
| `estimate.price.items[].packQty` | number, nullable | no | How much the pack holds, counted in packUnit - or in units of the dosage form (tablets, capsules) when packUnit is null. |  |  |
| `estimate.price.items[].packUnit` | string, nullable | no | Unit of packQty, e.g. ml, gm. Null when packQty is a count. |  |  |
| `estimate.price.items[].quantity` | integer | no |  |  |  |
| `estimate.price.items[].mrp` | number, nullable | no | MRP per pack |  |  |
| `estimate.price.items[].unitPrice` | number, nullable | no | Customer price per pack |  |  |
| `estimate.price.items[].linePrice` | number, nullable | no | unitPrice x quantity |  |  |
| `estimate.price.items[].storeUnitPrice` | number, nullable | no | Your store's price per pack, what your store owes LabStack: mrp less your store's own medicine discount |  |  |
| `estimate.price.items[].storeLinePrice` | number, nullable | no | storeUnitPrice x quantity |  |  |
| `estimate.price.items[].available` | boolean | no |  |  |  |
| `estimate.price.items[].prescriptionRequired` | boolean | no |  |  |  |

Example:
```json
{
  "status": "success",
  "estimate": {
    "lsPharmacyId": 456,
    "pharmacyName": "City Health Pharmacy",
    "orderType": "HOME_DELIVERY",
    "shipmentSpeed": "STANDARD",
    "shipmentSpeeds": [
      "STANDARD",
      "EXPRESS"
    ],
    "distance": null,
    "pickupLocation": null,
    "isLivePrice": true,
    "allItemsAvailable": true,
    "prescriptionRequired": true,
    "canCollectPayment": true,
    "price": {
      "currency": "INR",
      "mrpTotal": 290,
      "subTotal": 261,
      "additionalCharges": 40,
      "totalAmount": 301,
      "storeSubTotal": 246.5,
      "storeTotalAmount": 286.5,
      "items": [
        {
          "drugMasterId": "LSD100001",
          "name": "Azithral 500 Tablet",
          "packContainer": "strip",
          "packQty": 5,
          "packUnit": null,
          "quantity": 2,
          "mrp": 120,
          "unitPrice": 108,
          "linePrice": 216,
          "storeUnitPrice": 102,
          "storeLinePrice": 204,
          "available": true,
          "prescriptionRequired": true
        },
        {
          "drugMasterId": "LSD100002",
          "name": "Paracetamol 650mg Tablet",
          "packContainer": "strip",
          "packQty": 15,
          "packUnit": null,
          "quantity": 1,
          "mrp": 50,
          "unitPrice": 45,
          "linePrice": 45,
          "storeUnitPrice": 42.5,
          "storeLinePrice": 42.5,
          "available": true,
          "prescriptionRequired": false
        }
      ]
    }
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

##### 503

The pharmacy could not be reached or could not price the basket. Safe to retry.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "The pharmacy could not price this basket right now. Please try again shortly."
}
```

---

### GET /api/pharma/v1.0/order/getOrderDetails

**Get order details**

Tag: Orders · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

The full state of one of your orders, by LabStack `orderId` or by the `referenceId` you placed it with - send exactly one. `items` come back in the shape Place Order accepts - drugMasterId and quantity - with the customer price each was placed at, and the store price beside it. `unitPrice`, `subTotal` and `totalAmount` are what the customer pays: MRP less your store's customer medicine discount at the time of placing. `storeUnitPrice`, `storeSubTotal` and `storeTotalAmount` are what your store owes LabStack: MRP less your store's own medicine discount, plus the same `additionalCharges`. When the order ships, a drug dispatched from a batch printed at a lower MRP is repriced at that MRP with the same discounts, and both sets of totals drop with it; a higher printed MRP never raises a price. An order placed before customer prices were recorded reports the prices it was placed at, with no `mrp`, null store figures and possibly no `additionalCharges`. The pharmacy may split an order into several fulfilments, each with its own orderId and status. Such an order carries a `pharmaSuperOrderId` and lists the other fulfilments in `relatedOrders`. On a split, `totalAmount` and `storeTotalAmount` are for the whole order while `price` covers this fulfilment only; the delivery charge is made once, so it appears on one fulfilment. A referenceId names the fulfilment Place Order returned. A PICKUP order carries `pickupLocation`, where the customer collects it - the pharmacy's current address and opening hours. `address` stays the patient's, as sent to Place Order. Every documented field is always present; a value that does not exist is null. Order Status Webhook: every change to an order is POSTed to your store's pharmacy webhook URL, authenticated like your other LabStack webhooks. It carries `event` (what changed - orderStatus, paymentStatus, shipmentSpeed, pharmacy or drugs), `orderId`, `referenceId`, `orderStatus`, `previousStatus`, `orderType`, `orderDate`, `lsPharmacyId`, `pharmacyName`, `shipmentSpeed`, `paymentStatus`, `isPaymentRequired`, `pharmaSuperOrderId`, `shipmentTrackingId`, `totalAmount`, `cancelReason`, `uniqueId` and `userName`; call this endpoint for everything else.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `orderId` | query | integer | no | LabStack order id. Send this or referenceId. |  | "1234" |
| `referenceId` | query | string | no | Your own order id, e.g. MY-REF-001. Send this or orderId. |  |  |

#### Responses

##### 200

The order

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.referenceId` | string, nullable | no |  |  |  |
| `order.orderStatus` | string | no |  | enum: `PENDING`, `CREATED`, `PLACED`, `CONFIRMED`, `SHIPPED`, `PARTIAL_DELIVERED`, `FULL_DELIVERED`, `CANCELLED` |  |
| `order.orderType` | string | no |  | enum: `HOME_DELIVERY`, `PICKUP` |  |
| `order.orderDate` | string (date-time) | no |  |  |  |
| `order.lsPharmacyId` | integer | no |  |  |  |
| `order.pharmacyName` | string, nullable | no |  |  |  |
| `order.pickupLocation` | object, nullable | no | PICKUP only: where the customer collects the order. Null for HOME_DELIVERY, and for a pharmacy that chooses the pickup point when the order is placed. |  |  |
| `order.pickupLocation.address` | string, nullable | no |  |  |  |
| `order.pickupLocation.locality` | string, nullable | no |  |  |  |
| `order.pickupLocation.city` | string, nullable | no |  |  |  |
| `order.pickupLocation.state` | string, nullable | no |  |  |  |
| `order.pickupLocation.pincode` | string, nullable | no |  |  |  |
| `order.pickupLocation.latitude` | number | no |  |  |  |
| `order.pickupLocation.longitude` | number | no |  |  |  |
| `order.pickupLocation.openingTime` | string, nullable | no | HH:mm, India time, the same every day. Null together with closingTime when the pharmacy is open 24 hours. |  |  |
| `order.pickupLocation.closingTime` | string, nullable | no | HH:mm, India time. |  |  |
| `order.shipmentSpeed` | string, nullable | no |  | enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `order.shipmentTrackingId` | string, nullable | no |  |  |  |
| `order.invoiceUrl` | string, nullable | no | The pharmacy's GST invoice, once issued |  |  |
| `order.notes` | string, nullable | no |  |  |  |
| `order.cancelReason` | string, nullable | no | Set only on a CANCELLED order |  |  |
| `order.pharmaSuperOrderId` | integer, nullable | no | Set when the order was split into several fulfilments |  |  |
| `order.relatedOrders` | array<object> | no | The other fulfilments of a split order. Empty otherwise. |  |  |
| `order.relatedOrders[].orderId` | integer | no |  |  |  |
| `order.relatedOrders[].orderStatus` | string | no |  |  |  |
| `order.isPaymentRequired` | boolean | no | True while the order waits for payment and has not been sent to the pharmacy |  |  |
| `order.paymentStatus` | string | no |  | enum: `IDLE`, `PENDING`, `COMPLETED`, `CANCELLED` |  |
| `order.totalAmount` | number, nullable | no | What the customer pays for the whole order |  |  |
| `order.storeTotalAmount` | number, nullable | no | What your store owes LabStack for the whole order. Null on an order placed before store prices were recorded. |  |  |
| `order.price` | object | no | This fulfilment: its items and the charges it carries |  |  |
| `order.price.currency` | string | no |  |  | "INR" |
| `order.price.mrpTotal` | number, nullable | no |  |  |  |
| `order.price.subTotal` | number | no |  |  |  |
| `order.price.additionalCharges` | number, nullable | no | Null only on an order placed before customer prices were recorded, when unknown |  |  |
| `order.price.totalAmount` | number | no |  |  |  |
| `order.price.storeSubTotal` | number, nullable | no | The medicines at your store's price |  |  |
| `order.price.storeTotalAmount` | number, nullable | no | What your store owes LabStack: storeSubTotal + additionalCharges |  |  |
| `order.price.items` | array<object> | no |  |  |  |
| `order.price.items[].drugMasterId` | string, nullable | no |  |  |  |
| `order.price.items[].name` | string, nullable | no |  |  |  |
| `order.price.items[].packContainer` | string, nullable | no | What the pack is, e.g. strip, bottle, vial |  |  |
| `order.price.items[].packQty` | number, nullable | no | How much the pack holds, counted in packUnit - or in units of the dosage form (tablets, capsules) when packUnit is null. |  |  |
| `order.price.items[].packUnit` | string, nullable | no | Unit of packQty, e.g. ml, gm. Null when packQty is a count. |  |  |
| `order.price.items[].quantity` | integer | no |  |  |  |
| `order.price.items[].mrp` | number, nullable | no |  |  |  |
| `order.price.items[].unitPrice` | number, nullable | no | Customer price per pack |  |  |
| `order.price.items[].linePrice` | number, nullable | no |  |  |  |
| `order.price.items[].storeUnitPrice` | number, nullable | no | Your store's price per pack, what your store owes LabStack: mrp less your store's own medicine discount |  |  |
| `order.price.items[].storeLinePrice` | number, nullable | no | storeUnitPrice x quantity |  |  |
| `order.documents` | array<object> | no |  |  |  |
| `order.documents[].documentId` | integer | no |  |  |  |
| `order.documents[].type` | string | no |  | enum: `PRESCRIPTION`, `PRIOR_PRESCRIPTION`, `REFERRAL`, `OTHER` |  |
| `order.documents[].url` | string | no |  |  |  |
| `order.patient` | object | no |  |  |  |
| `order.patient.uniqueId` | string | no |  |  |  |
| `order.patient.name` | string | no |  |  |  |
| `order.patient.dateOfBirth` | string, nullable | no | YYYY-MM-DD |  |  |
| `order.patient.age` | integer, nullable | no |  |  |  |
| `order.patient.gender` | string, nullable | no |  | enum: `MALE`, `FEMALE`, `OTHERS` |  |
| `order.patient.mobile` | string, nullable | no |  |  |  |
| `order.patient.altNumber` | string, nullable | no |  |  |  |
| `order.patient.email` | string, nullable | no |  |  |  |
| `order.patient.mainUserUniqueId` | string, nullable | no |  |  |  |
| `order.patient.relationship` | string, nullable | no |  |  |  |
| `order.address` | object | no | The patient's address as sent to Place Order. For PICKUP, see pickupLocation. |  |  |
| `order.address.unitFloorBuilding` | string, nullable | no |  |  |  |
| `order.address.address` | string, nullable | no |  |  |  |
| `order.address.locality` | string, nullable | no |  |  |  |
| `order.address.city` | string, nullable | no |  |  |  |
| `order.address.state` | string, nullable | no |  |  |  |
| `order.address.pincode` | string, nullable | no |  |  |  |
| `order.address.latitude` | number, nullable | no |  |  |  |
| `order.address.longitude` | number, nullable | no |  |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 1234,
    "referenceId": "MY-REF-001",
    "orderStatus": "CONFIRMED",
    "orderType": "HOME_DELIVERY",
    "orderDate": "2026-09-29T09:00:00.000Z",
    "lsPharmacyId": 456,
    "pharmacyName": "City Health Pharmacy",
    "pickupLocation": null,
    "shipmentSpeed": "STANDARD",
    "shipmentTrackingId": null,
    "invoiceUrl": null,
    "notes": "Leave at reception",
    "cancelReason": null,
    "pharmaSuperOrderId": null,
    "relatedOrders": [],
    "isPaymentRequired": false,
    "paymentStatus": "PENDING",
    "totalAmount": 301,
    "storeTotalAmount": 286.5,
    "price": {
      "currency": "INR",
      "mrpTotal": 290,
      "subTotal": 261,
      "additionalCharges": 40,
      "totalAmount": 301,
      "storeSubTotal": 246.5,
      "storeTotalAmount": 286.5,
      "items": [
        {
          "drugMasterId": "LSD100001",
          "name": "Azithral 500 Tablet",
          "packContainer": "strip",
          "packQty": 5,
          "packUnit": null,
          "quantity": 2,
          "mrp": 120,
          "unitPrice": 108,
          "linePrice": 216,
          "storeUnitPrice": 102,
          "storeLinePrice": 204
        },
        {
          "drugMasterId": "LSD100002",
          "name": "Paracetamol 650mg Tablet",
          "packContainer": "strip",
          "packQty": 15,
          "packUnit": null,
          "quantity": 1,
          "mrp": 50,
          "unitPrice": 45,
          "linePrice": 45,
          "storeUnitPrice": 42.5,
          "storeLinePrice": 42.5
        }
      ]
    },
    "documents": [
      {
        "documentId": 88,
        "type": "PRESCRIPTION",
        "url": "https://files.example.com/prescription.pdf"
      }
    ],
    "patient": {
      "uniqueId": "USR-001",
      "name": "Jane Doe",
      "dateOfBirth": "1990-04-12",
      "age": 36,
      "gender": "FEMALE",
      "mobile": "9876543210",
      "altNumber": null,
      "email": "jane@example.com",
      "mainUserUniqueId": null,
      "relationship": null
    },
    "address": {
      "unitFloorBuilding": null,
      "address": "42, MG Road",
      "locality": null,
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "latitude": 12.9716,
      "longitude": 77.5946
    }
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

No such order among yours

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Order 1234 not found"
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

### POST /api/pharma/v1.0/order/placeOrder

**Place order**

Tag: Orders · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Creates a pharmacy order for a patient and sends it to the pharmacy. The basket is checked exactly as Get Estimate checks it, and the order is created only when the pharmacy can supply every drug in the quantity asked; otherwise the call is a 400 naming the drugMasterIds, and nothing is created. Only the drugMasterIds you send are ordered - nothing is substituted. A drug marked `notForSale` in the catalogue (Schedule X or habit-forming) cannot be ordered online: a basket containing one is a 400 naming it, whatever prescriptions are sent. Prescriptions go in `documents`. They are required when any drug needs one (Get Estimate's `prescriptionRequired`), and they reach the pharmacy with the order. A document added later with Upload Prescription is forwarded by LabStack instead. If the documents cannot be stored the call is a 503, no order is left behind, and it is safe to retry. Send a `referenceId` - your own order id - to make retries safe: while an order with that referenceId exists and is not cancelled, a second Place Order with it is a 409 that returns the existing `orderId`. A request identical to one still in progress is also a 409. `order.price.totalAmount` is what the customer pays: each drug's MRP less your store's customer medicine discount, which is also what the pharmacy invoices the customer, plus `additionalCharges`. `order.price.storeTotalAmount` is what your store owes LabStack: each drug's MRP less your store's own medicine discount, plus the same `additionalCharges`. Both are fixed when the order is placed and never rise afterwards; they drop only if a drug is dispatched from a batch printed at a lower MRP, which Get Order Details then reports. A 200 means LabStack has the order; `orderStatus` says where it is. PLACED - the pharmacy has it. CREATED - taken by LabStack for a pharmacy it places orders with directly. PENDING - waiting for payment (`isPaymentRequired` is true), or the pharmacy did not accept it automatically, in which case `placementError` says so and LabStack follows it up. Every later change arrives on the Order Status Webhook. Set `isPaymentRequired` to collect payment before the order is sent. The response then carries a `paymentLink`, valid until `paymentLinkExpiresAt` (16 minutes). The order stays PENDING and the pharmacy does not see it until it is paid. Once paid it is sent and moves to PLACED - or CREATED for a pharmacy LabStack places orders with directly, or stays PENDING if the pharmacy does not accept it - and the webhook reports it. If the link lapses unpaid the order is cancelled. Payment needs a live price (Get Estimate's `canCollectPayment`), and when payment cannot be set up the call is a 503 with no order left behind. HOME_DELIVERY needs `address`, `city`, `state` and `pincode`. PICKUP needs the patient's `pincode` or a `latitude`/`longitude` pair, and is accepted only when the pharmacy's pickup point is within `range` km of it (10 unless sent, at most 100) - the rule Check Serviceability and Get Estimate apply. `pickupLocation` in the response is where the customer collects the order. One of `dateOfBirth` or `age` is required.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderType` | string | yes |  | enum: `HOME_DELIVERY`, `PICKUP` | "HOME_DELIVERY" |
| `lsPharmacyId` | integer | yes | A pharmacy from Check Serviceability |  | 456 |
| `drugs` | array<object> | yes | One entry per drug. Repeated drugMasterIds are merged; at most 100 of any one drug. | minItems: `1`; maxItems: `50` |  |
| `drugs[].drugMasterId` | string | yes | Identifies a brand and pack, not a salt |  | "LSD100001" |
| `drugs[].quantity` | integer | yes |  | minimum: `1`; maximum: `100` | 2 |
| `referenceId` | string | no | Optional but recommended. Your own order id. Unique among your orders that are not cancelled; usable with Get Order Details, Cancel Order and Upload Prescription. | maxLength: `100` | "MY-REF-001" |
| `name` | string | yes | Letters, digits and spaces; other characters are removed. | maxLength: `50` | "Jane Doe" |
| `gender` | string | yes |  | enum: `MALE`, `FEMALE`, `OTHERS` | "FEMALE" |
| `mobile` | string | yes | 10 digits. A +91 prefix, spaces and dashes are accepted. |  | "9876543210" |
| `dateOfBirth` | string (date) | no | YYYY-MM-DD. Required unless age is sent; used over age when both are. |  | "1990-04-12" |
| `age` | integer | no | Whole years. Required unless dateOfBirth is sent. | minimum: `0`; maximum: `120` | 36 |
| `email` | string | no | Optional |  | "jane@example.com" |
| `altNumber` | string | no | Optional alternate contact, 10 digits |  | "9876500000" |
| `uniqueId` | string | no | Optional. Your id for the patient; the same uniqueId is the same patient on every order. Derived from mobile and name when omitted. | maxLength: `100` | "USR-001" |
| `mainUserUniqueId` | string | no | Optional. uniqueId of an existing patient this one is a dependant of. |  | "USR-000" |
| `relationship` | string | no | Optional. How the patient relates to mainUserUniqueId, which it requires. Defaults to OTHER. |  | "SON" |
| `unitFloorBuilding` | string | no |  |  | "Flat 3B" |
| `address` | string | no | Required for HOME_DELIVERY | maxLength: `200` | "42, MG Road" |
| `locality` | string | no |  |  | "Indiranagar" |
| `city` | string | no | Required for HOME_DELIVERY |  | "Bangalore" |
| `state` | string | no | Required for HOME_DELIVERY |  | "Karnataka" |
| `pincode` | string | no | Required for HOME_DELIVERY. For PICKUP, required unless latitude and longitude are sent. 6 digits. |  | "560001" |
| `latitude` | number | no | Optional. The patient's location, when you have it: the delivery point, or where a PICKUP distance is measured from. Send with longitude. |  | 12.9716 |
| `longitude` | number | no |  |  | 77.5946 |
| `range` | number | no | Optional, PICKUP only. How far, in km, the pickup point may be from the patient. Greater than 0 and at most 100. Default 10. |  |  |
| `shipmentSpeed` | string | no | Optional. One of the pharmacy's shipmentSpeeds from Check Serviceability. Omit for its default. | enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `notes` | string | no | Optional note for the pharmacy | maxLength: `1000` | "Leave at reception" |
| `isPaymentRequired` | boolean | no | Optional, default false. Hold the order until the returned paymentLink is paid. |  | false |
| `documents` | array<object> | no | Prescriptions. Required when any drug needs one. | maxItems: `5` |  |
| `documents[].content` | string | yes | Base64 file content, at most 10 MB. A data-URI prefix is accepted. |  | "JVBERi0xLjQK..." |
| `documents[].fileName` | string | yes | With extension: pdf, jpg, jpeg or png |  | "prescription.pdf" |

Example:
```json
{
  "orderType": "HOME_DELIVERY",
  "lsPharmacyId": 456,
  "referenceId": "MY-REF-001",
  "drugs": [
    {
      "drugMasterId": "LSD100001",
      "quantity": 2
    },
    {
      "drugMasterId": "LSD100002",
      "quantity": 1
    }
  ],
  "name": "Jane Doe",
  "gender": "FEMALE",
  "mobile": "9876543210",
  "dateOfBirth": "1990-04-12",
  "email": "jane@example.com",
  "uniqueId": "USR-001",
  "address": "42, MG Road",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "shipmentSpeed": "STANDARD",
  "documents": [
    {
      "content": "JVBERi0xLjQK...",
      "fileName": "prescription.pdf"
    }
  ]
}
```

#### Responses

##### 200

LabStack has the order. Check orderStatus for where it is.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no | LabStack order id |  |  |
| `order.referenceId` | string, nullable | no |  |  |  |
| `order.orderStatus` | string | no |  | enum: `PLACED`, `CREATED`, `PENDING` |  |
| `order.orderType` | string | no |  | enum: `HOME_DELIVERY`, `PICKUP` |  |
| `order.lsPharmacyId` | integer | no |  |  |  |
| `order.pharmacyName` | string | no |  |  |  |
| `order.pickupLocation` | object, nullable | no | PICKUP only: where the customer collects the order. Null for HOME_DELIVERY, and for a pharmacy that chooses the pickup point when the order is placed. |  |  |
| `order.pickupLocation.address` | string, nullable | no |  |  |  |
| `order.pickupLocation.locality` | string, nullable | no |  |  |  |
| `order.pickupLocation.city` | string, nullable | no |  |  |  |
| `order.pickupLocation.state` | string, nullable | no |  |  |  |
| `order.pickupLocation.pincode` | string, nullable | no |  |  |  |
| `order.pickupLocation.latitude` | number | no |  |  |  |
| `order.pickupLocation.longitude` | number | no |  |  |  |
| `order.pickupLocation.openingTime` | string, nullable | no | HH:mm, India time, the same every day. Null together with closingTime when the pharmacy is open 24 hours. |  |  |
| `order.pickupLocation.closingTime` | string, nullable | no | HH:mm, India time. |  |  |
| `order.shipmentSpeed` | string, nullable | no |  |  |  |
| `order.pharmaSuperOrderId` | integer, nullable | no | Set when the pharmacy split the order into several fulfilments; Get Order Details lists them. Null otherwise. |  |  |
| `order.isPaymentRequired` | boolean | no | True while the order waits for payment |  |  |
| `order.paymentLink` | string, nullable | no | Only when isPaymentRequired was sent true |  |  |
| `order.paymentLinkExpiresAt` | string (date-time), nullable | no | When an unpaid order is cancelled |  |  |
| `order.placementError` | string, nullable | no | Set when the pharmacy did not accept the order (orderStatus PENDING, isPaymentRequired false). Null otherwise, including for an order waiting for payment. |  |  |
| `order.documents` | array<object> | no |  |  |  |
| `order.documents[].documentId` | integer | no |  |  |  |
| `order.price` | object | no |  |  |  |
| `order.price.currency` | string | no |  |  | "INR" |
| `order.price.mrpTotal` | number, nullable | no | Null when any drug has no MRP on record |  |  |
| `order.price.subTotal` | number | no | The medicines at the customer price |  |  |
| `order.price.additionalCharges` | number | no | Delivery and every other fee on top of the medicines |  |  |
| `order.price.totalAmount` | number | no | What the customer pays: subTotal + additionalCharges |  |  |
| `order.price.storeSubTotal` | number, nullable | no | The medicines at your store's price |  |  |
| `order.price.storeTotalAmount` | number, nullable | no | What your store owes LabStack: storeSubTotal + additionalCharges |  |  |
| `order.price.items` | array<object> | no |  |  |  |
| `order.price.items[].drugMasterId` | string | no |  |  |  |
| `order.price.items[].name` | string | no |  |  |  |
| `order.price.items[].packContainer` | string, nullable | no | What the pack is, e.g. strip, bottle, vial |  |  |
| `order.price.items[].packQty` | number, nullable | no | How much the pack holds, counted in packUnit - or in units of the dosage form (tablets, capsules) when packUnit is null. |  |  |
| `order.price.items[].packUnit` | string, nullable | no | Unit of packQty, e.g. ml, gm. Null when packQty is a count. |  |  |
| `order.price.items[].quantity` | integer | no |  |  |  |
| `order.price.items[].mrp` | number, nullable | no |  |  |  |
| `order.price.items[].unitPrice` | number, nullable | no | Customer price per pack |  |  |
| `order.price.items[].linePrice` | number, nullable | no |  |  |  |
| `order.price.items[].storeUnitPrice` | number, nullable | no | Your store's price per pack, what your store owes LabStack: mrp less your store's own medicine discount |  |  |
| `order.price.items[].storeLinePrice` | number, nullable | no | storeUnitPrice x quantity |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 1234,
    "referenceId": "MY-REF-001",
    "orderStatus": "PLACED",
    "orderType": "HOME_DELIVERY",
    "lsPharmacyId": 456,
    "pharmacyName": "City Health Pharmacy",
    "pickupLocation": null,
    "shipmentSpeed": "STANDARD",
    "pharmaSuperOrderId": null,
    "isPaymentRequired": false,
    "paymentLink": null,
    "paymentLinkExpiresAt": null,
    "placementError": null,
    "documents": [
      {
        "documentId": 88
      }
    ],
    "price": {
      "currency": "INR",
      "mrpTotal": 290,
      "subTotal": 261,
      "additionalCharges": 40,
      "totalAmount": 301,
      "storeSubTotal": 246.5,
      "storeTotalAmount": 286.5,
      "items": [
        {
          "drugMasterId": "LSD100001",
          "name": "Azithral 500 Tablet",
          "packContainer": "strip",
          "packQty": 5,
          "packUnit": null,
          "quantity": 2,
          "mrp": 120,
          "unitPrice": 108,
          "linePrice": 216,
          "storeUnitPrice": 102,
          "storeLinePrice": 204
        },
        {
          "drugMasterId": "LSD100002",
          "name": "Paracetamol 650mg Tablet",
          "packContainer": "strip",
          "packQty": 15,
          "packUnit": null,
          "quantity": 1,
          "mrp": 50,
          "unitPrice": 45,
          "linePrice": 45,
          "storeUnitPrice": 42.5,
          "storeLinePrice": 42.5
        }
      ]
    }
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

##### 409

An order with this referenceId exists, or an identical request is in progress

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  |  | "failure" |
| `error` | string | no |  |  |  |
| `orderId` | integer | no | The existing order, when the referenceId is taken |  |  |

Example:
```json
{
  "status": "failure",
  "error": "An order with referenceId 'MY-REF-001' already exists",
  "orderId": 1234
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

The documents could not be stored or payment could not be set up. No order was left behind; safe to retry.

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Payment could not be set up for this order, so it was not placed. Please try again."
}
```

---

### POST /api/pharma/v1.0/order/uploadPrescription

**Upload prescription**

Tag: Orders · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Attaches prescriptions to one of your orders, by `orderId` or `referenceId`. Prefer sending them in Place Order's `documents`, where they reach the pharmacy with the order. `forwarding` says how these reach the pharmacy. WITH_ORDER - the pharmacy has not received the order yet, and the documents go with it. BY_LABSTACK - the pharmacy already has the order, so LabStack forwards the documents to it; allow time for that before the pharmacy acts on them. A CANCELLED, FULL_DELIVERED or PARTIAL_DELIVERED order takes no documents (409). When some documents are stored and others are not, the call succeeds and `errors` names the ones that were not; when none are stored it is a 503 and safe to retry.

#### Request body (required)

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `orderId` | integer | no | LabStack order id. Send this or referenceId. |  | 1234 |
| `referenceId` | string | no | Your own order id. Send this or orderId. |  | "MY-REF-001" |
| `documents` | array<object> | yes |  | minItems: `1`; maxItems: `5` |  |
| `documents[].content` | string | yes | Base64 file content, at most 10 MB. A data-URI prefix is accepted. |  | "JVBERi0xLjQK..." |
| `documents[].fileName` | string | yes | With extension: pdf, jpg, jpeg or png |  | "prescription.pdf" |

Example:
```json
{
  "orderId": 1234,
  "documents": [
    {
      "content": "JVBERi0xLjQK...",
      "fileName": "prescription.pdf"
    }
  ]
}
```

#### Responses

##### 200

The documents are attached to the order

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `order` | object | no |  |  |  |
| `order.orderId` | integer | no |  |  |  |
| `order.referenceId` | string, nullable | no |  |  |  |
| `order.orderStatus` | string | no |  |  |  |
| `order.documents` | array<object> | no |  |  |  |
| `order.documents[].documentId` | integer | no |  |  |  |
| `order.forwarding` | string | no |  | enum: `WITH_ORDER`, `BY_LABSTACK` |  |
| `order.errors` | array<string> | no | Documents that were not stored. Empty when all were. |  |  |

Example:
```json
{
  "status": "success",
  "order": {
    "orderId": 1234,
    "referenceId": "MY-REF-001",
    "orderStatus": "CONFIRMED",
    "documents": [
      {
        "documentId": 89
      }
    ],
    "forwarding": "BY_LABSTACK",
    "errors": []
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

No such order among yours

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Order 1234 not found"
}
```

##### 409

The order is closed and takes no more documents

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | yes |  | enum: `failure` | "failure" |
| `error` | string | yes |  |  | "Authorisation failed - API Key not present in HTTP Header." |

Example:
```json
{
  "status": "failure",
  "error": "Order 1234 is CANCELLED and takes no more documents"
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

## Serviceability

### GET /api/pharma/v1.0/network/checkServiceability

**Check serviceability**

Tag: Serviceability · Auth: `ApiKeyAuth` (header `ls-api-key: <YOUR_API_KEY>`)

Lists the pharmacies in your network that can fulfil an order at a location, with the order types and shipment speeds each offers there. Send `pincode`, a `latitude`/`longitude` pair, or both. The optional address fields refine a pincode into a more precise location and require it. HOME_DELIVERY is offered where the pharmacy delivers to the location. PICKUP is offered when the pharmacy's pickup point is within `range` km of the location - 10 km unless you send `range`, at most 100. `distance` says how far away it is, and `pickupLocation` where the customer collects the order and when the pharmacy is open. A few pharmacies choose the pickup point nearest the customer only when the order is placed; they are listed for PICKUP with a null `distance` and `pickupLocation`, and `range` does not apply to them. Order: with `orderType=PICKUP`, the nearest pickup point comes first. Otherwise pharmacies come in your network's order of preference, the nearest first among those you prefer equally. A pharmacy with no `distance` follows those with one. Use a returned `lsPharmacyId` with Search Drugs, Get Estimate and Place Order, and send Get Estimate and Place Order the same location and `range`: they apply the same rules. A `shipmentSpeed` you send to them must be one of that pharmacy's `shipmentSpeeds`; an empty list means the pharmacy offers no choice of speed, so omit it.

#### Parameters

| Name | In | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `pincode` | query | string | no | Required unless latitude and longitude are sent. 6 digits. |  | "560001" |
| `latitude` | query | number | no | Required unless pincode is sent. -90 to 90. Send with longitude. |  | "12.9716" |
| `longitude` | query | number | no | Required unless pincode is sent. -180 to 180. Send with latitude. |  | "77.5946" |
| `orderType` | query | string | no | Optional. Only pharmacies taking this order type. PICKUP also lists the nearest pickup point first. | enum: `HOME_DELIVERY`, `PICKUP` |  |
| `range` | query | number | no | Optional. How far, in km, a pickup point may be from the location for PICKUP to be offered. Greater than 0 and at most 100; may be fractional. Default 10. |  |  |
| `shipmentSpeed` | query | string | no | Optional. Only pharmacies offering this speed at the location. | enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `unitFloorBuilding` | query | string | no | Optional. Refines the location. Requires pincode. |  |  |
| `address` | query | string | no | Optional. Refines the location. Requires pincode. |  | "42, MG Road" |
| `locality` | query | string | no | Optional. Refines the location. Requires pincode. |  | "Indiranagar" |
| `city` | query | string | no | Optional. Refines the location. Requires pincode. |  | "Bangalore" |
| `state` | query | string | no | Optional. Refines the location. Requires pincode. |  | "Karnataka" |

#### Responses

##### 200

Pharmacies that can fulfil an order at the location

Content type: `application/json`

| Field | Type | Required | Description | Constraints | Example |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no |  | enum: `success` | "success" |
| `pincode` | string, nullable | no | The pincode the location resolved to. Null only when latitude and longitude alone were sent and your network has no pharmacies. |  |  |
| `latitude` | number, nullable | no | The point distances are measured from. Null only when a pincode alone was sent and no answer depended on a more precise location; PICKUP is then offered only by pharmacies that choose the pickup point when the order is placed. |  |  |
| `longitude` | number, nullable | no |  |  |  |
| `pharmacies` | array<object> | no | In the order described above. Empty when no network pharmacy serves the location. |  |  |
| `pharmacies[].lsPharmacyId` | integer | no | Pass as lsPharmacyId to Get Estimate and Place Order |  |  |
| `pharmacies[].pharmacyName` | string | no |  |  |  |
| `pharmacies[].orderTypes` | array<string> | no | The order types this pharmacy takes at the location | items: enum: `HOME_DELIVERY`, `PICKUP` |  |
| `pharmacies[].shipmentSpeeds` | array<string> | no | Speeds you may request. Empty when the pharmacy offers no choice. | items: enum: `STANDARD`, `EXPRESS`, `SAME_DAY`, `PAN_INDIA` |  |
| `pharmacies[].distance` | number, nullable | no | Km from the location to the pickup point, to 2 decimal places. Null unless orderTypes includes PICKUP and the pickup point is known. |  |  |
| `pharmacies[].pickupLocation` | object, nullable | no | Where the customer collects a PICKUP order. Null exactly when distance is. |  |  |
| `pharmacies[].pickupLocation.address` | string, nullable | no |  |  |  |
| `pharmacies[].pickupLocation.locality` | string, nullable | no |  |  |  |
| `pharmacies[].pickupLocation.city` | string, nullable | no |  |  |  |
| `pharmacies[].pickupLocation.state` | string, nullable | no |  |  |  |
| `pharmacies[].pickupLocation.pincode` | string, nullable | no |  |  |  |
| `pharmacies[].pickupLocation.latitude` | number | no |  |  |  |
| `pharmacies[].pickupLocation.longitude` | number | no |  |  |  |
| `pharmacies[].pickupLocation.openingTime` | string, nullable | no | HH:mm, India time, the same every day. Null together with closingTime when the pharmacy is open 24 hours. |  |  |
| `pharmacies[].pickupLocation.closingTime` | string, nullable | no | HH:mm, India time. |  |  |

Example:
```json
{
  "status": "success",
  "pincode": "560038",
  "latitude": 12.9784,
  "longitude": 77.6408,
  "pharmacies": [
    {
      "lsPharmacyId": 456,
      "pharmacyName": "City Health Pharmacy",
      "orderTypes": [
        "HOME_DELIVERY",
        "PICKUP"
      ],
      "shipmentSpeeds": [],
      "distance": 0.74,
      "pickupLocation": {
        "address": "612, 100 Feet Road, HAL 2nd Stage",
        "locality": "Indiranagar",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560038",
        "latitude": 12.9719,
        "longitude": 77.6412,
        "openingTime": "08:00",
        "closingTime": "22:00"
      }
    },
    {
      "lsPharmacyId": 458,
      "pharmacyName": "Koramangala Medicals",
      "orderTypes": [
        "PICKUP"
      ],
      "shipmentSpeeds": [],
      "distance": 5.83,
      "pickupLocation": {
        "address": "14, 80 Feet Road, 4th Block",
        "locality": "Koramangala",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560034",
        "latitude": 12.9279,
        "longitude": 77.6271,
        "openingTime": null,
        "closingTime": null
      }
    },
    {
      "lsPharmacyId": 457,
      "pharmacyName": "MG Road Chemist",
      "orderTypes": [
        "HOME_DELIVERY"
      ],
      "shipmentSpeeds": [
        "STANDARD",
        "EXPRESS"
      ],
      "distance": null,
      "pickupLocation": null
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

