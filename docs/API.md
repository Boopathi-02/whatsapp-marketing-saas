# API Specification & Conventions

## 1. Protocol & Versioning

- **Base URL Prefix**: `/api/v1`
- **Protocol**: HTTPS (enforced in production)
- **Content Type**: `application/json` (enforced with 1MB maximum payload limits)
- **Versioning Strategy**: URI prefix versioning (`/api/v1`). Breaking changes will trigger an increment to `/api/v2` with a 90-day deprecation grace window.

---

## 2. Standardized Response Formats

All API endpoints strictly follow predictable JSON response envelopes.

### Success Response Envelope (HTTP 200, 201)

```json
{
  "success": true,
  "data": {
    "id": "item-123",
    "name": "Spring Campaign"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response Envelope (HTTP 4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid",
    "details": [
      {
        "field": "phoneNumber",
        "message": "Phone number must match E.164 international format",
        "code": "invalid_string"
      }
    ]
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Standard Error Codes

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 | Request body or query parameters failed Zod validation |
| `BAD_REQUEST` | 400 | Malformed JSON or syntactically invalid input |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid authentication credentials |
| `FORBIDDEN` | 403 | User lacks required role permissions within the workspace |
| `NOT_FOUND` | 404 | Endpoint or targeted resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. phone number already enrolled in workspace) |
| `RATE_LIMITED` | 429 | Rate limit threshold exceeded |
| `DATABASE_UNAVAILABLE` | 503 | Database connection temporarily lost or unreachable |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled internal exception (sanitized in production) |

---

## 3. Health & Liveness Endpoints

### 1. `GET /api/v1/health` (Liveness Probe)
- **Purpose**: Verifies the API server process is alive and accepting incoming HTTP connections.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-10-16T11:30:00.000Z",
    "uptimeSeconds": 1420,
    "version": "1.0.0",
    "environment": "development"
  },
  "requestId": "b06871be-cf2c-4ec1-91a5-8e3adcb502df"
}
```

### 2. `GET /api/v1/health/ready` (Readiness Probe)
- **Purpose**: Verifies that external infrastructure dependencies (MongoDB) are connected and responding.
- **Behavior**:
  - Returns `200 OK` if MongoDB `ping` command succeeds.
  - Returns `503 Service Unavailable` if MongoDB is disconnected or unresponsive.
  - Never reports healthy without active verification.
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "timestamp": "2026-10-16T11:30:00.000Z",
    "services": {
      "database": {
        "status": "connected",
        "latencyMs": 4
      }
    }
  },
  "requestId": "b06871be-cf2c-4ec1-91a5-8e3adcb502df"
}
```
