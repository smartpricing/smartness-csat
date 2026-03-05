# smartness-csat

A REST API for collecting and analysing CSAT (Customer Satisfaction) feedback on product features. It tracks user interactions with features, decides when to prompt for feedback, and stores ratings and comments.

**Stack:** Fastify 5 · TypeScript · PostgreSQL · Zod · OpenTelemetry  
**API docs:** `/openapi/api/csat/v1/openapi.json` (Swagger UI and Scalar also available)

---

## Quickstart

```bash
npm install
npm run dev
```

Environment variables are read from `.env`. Required keys are documented in `src/config.ts`.

---

## Core workflows

All routes are prefixed with `/api/csat/v1`.  
Every request body and query parameter must use `Content-Type: application/json`.

### 1. Get a user's current interactions

Returns the interaction state for every feature in a product for a given user — including how many times they have used each feature and whether the CSAT prompt has already been shown or rejected.

```
GET /api/csat/v1/products/:product_key/feature-interactions?user_email=<email>
```

**Query parameters**

| Name | Type | Required |
|------|------|----------|
| `user_email` | string (email) | yes |

**Response**

```json
{
  "data": [
    {
      "product_feature_key": "dashboard",
      "interaction_count": 3,
      "total_interaction_count": 11,
      "interaction_threshold": 5,
      "rejection_count": 1,
      "rejection_threshold": 3,
      "should_request_feedback": false
    },
    {
      "product_feature_key": "export-csv",
      "interaction_count": 5,
      "total_interaction_count": 5,
      "interaction_threshold": 5,
      "rejection_count": 0,
      "rejection_threshold": 3,
      "should_request_feedback": true
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `interaction_count` | Interactions since the last rejection (resets on reject) |
| `total_interaction_count` | All-time interaction count |
| `interaction_threshold` | Number of interactions required before the CSAT prompt is shown |
| `rejection_count` | How many times the user has dismissed the prompt for this feature |
| `rejection_threshold` | Max rejections before the prompt is permanently suppressed |
| `should_request_feedback` | `true` when the prompt should be displayed to the user |

---

### 2. Track a new interaction

Call this every time a user interacts with a feature. The response indicates whether the CSAT prompt should be shown to the user (`show_survey: true`).

```
POST /api/csat/v1/products/:product_key/features/:feature_key/increment
```

**Body**

```json
{
  "user_email": "user@example.com"
}
```

**Response**

```json
{
  "user_email": "user@example.com",
  "interaction_count": 5,
  "total_interaction_count": 5,
  "interaction_threshold": 5,
  "rejection_count": 0,
  "rejection_threshold": 3,
  "should_request_feedback": true,
  "created_at": "2026-01-10T08:00:00.000Z",
  "updated_at": "2026-03-05T14:32:00.000Z"
}
```

When `should_request_feedback` is `true`, the CSAT prompt should be displayed to the user.

---

### 3. Track a rejection

Call this when a user dismisses the CSAT prompt without submitting feedback. It resets the interaction counter and records the rejection, so the user is not prompted again immediately.

```
POST /api/csat/v1/products/:product_key/features/:feature_key/reject
```

**Body**

```json
{
  "user_email": "user@example.com"
}
```

---

### 4. Track a feedback

Call this when a user submits a CSAT rating (and optional comment).

```
POST /api/csat/v1/products/:product_key/features/:feature_key/feedbacks
```

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_email` | string (email) | yes | |
| `rating` | integer | yes | 1–10 |
| `source` | string | yes | `"prompted"` or `"voluntary"` |
| `comment` | string | no | Free-text comment |
| `user_agent` | string | no | Browser user-agent string |

```json
{
  "user_email": "user@example.com",
  "rating": 8,
  "source": "prompted",
  "comment": "Works great, but could be faster."
}
```

---

## Other endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/csat/v1/products` | List all products |
| `GET` | `/api/csat/v1/features?product_key=<key>` | List features, optionally filtered by product |
| `GET` | `/api/csat/v1/analytics/...` | Analytics — summary, per-user, and time-series views |
