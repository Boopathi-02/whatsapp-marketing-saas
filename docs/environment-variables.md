# Environment Variables Reference

This document details all validated environment variables required across Pingza microservices and applications.

---

## 1. Core API Service (`apps/api`)

| Variable | Type | Default | Required in Production | Description |
|---|---|---|---|---|
| `NODE_ENV` | `enum` | `'development'` | Yes | Application environment (`'development'` \| `'test'` \| `'production'`). |
| `API_PORT` | `number` | `4000` | No | HTTP listening port for Express API. |
| `API_HOST` | `string` | `'0.0.0.0'` | No | Network interface binding host. |
| `API_PREFIX` | `string` | `'/api/v1'` | No | Base routing prefix for REST API endpoints. |
| `WEB_ORIGIN` | `string` | `'http://localhost:3000'` | Yes | Allowed CORS origin and cookie domain matching frontend domain. |
| `MONGODB_URI` | `string` | `'mongodb://localhost:27017/whatsapp_saas_dev'` | Yes | Connection string to MongoDB replica set. |
| `MONGODB_MAX_POOL_SIZE` | `number` | `10` | No | Max database connection pool size. |
| `MONGODB_MIN_POOL_SIZE` | `number` | `2` | No | Min database connection pool size. |
| `REDIS_URL` | `string` | `'redis://localhost:6379'` | Yes | Redis broker URI for BullMQ queues and cache. |
| `LOG_LEVEL` | `enum` | `'info'` | No | Pino logger verbosity (`'fatal'`, `'error'`, `'warn'`, `'info'`, `'debug'`, `'trace'`). |
| `JWT_ACCESS_SECRET` | `string` | (dev fallback) | **Yes** | Secret used to sign short-lived Bearer access tokens (min 32 chars). |
| `JWT_ACCESS_EXPIRES_IN` | `string` | `'15m'` | No | Access token expiration duration. |
| `REFRESH_TOKEN_EXPIRES_DAYS` | `number` | `7` | No | Refresh token session expiration in days. |
| `COOKIE_DOMAIN` | `string` | `undefined` | Staging/Prod | Cookie domain for HttpOnly refresh token cookie. |
| `CREDENTIAL_ENCRYPTION_KEY` | `string` | (dev fallback) | **Yes** | 32-byte hex key (64 hex characters) used for AES-256-GCM encryption of Meta tokens at rest. |
| `META_GRAPH_API_VERSION` | `string` | `'v26.0'` | No | Meta Graph API version used for WhatsApp Cloud API calls. |
| `META_APP_ID` | `string` | (configured) | **Yes** | Official Meta App ID created in Meta Developer Dashboard. |
| `META_APP_SECRET` | `string` | (configured) | **Yes** | Meta App Secret used for code exchange and webhook signature validation. |
| `META_CONFIG_ID` | `string` | (configured) | **Yes** | Meta Embedded Signup v4 Configuration ID from Facebook Login for Business. |
| `META_WEBHOOK_VERIFY_TOKEN` | `string` | (configured) | **Yes** | Verification token for Meta webhook subscription handshake (`hub.challenge`). |

---

## 2. Background Worker Service (`apps/worker`)

| Variable | Type | Default | Required in Production | Description |
|---|---|---|---|---|
| `NODE_ENV` | `enum` | `'development'` | Yes | Application environment. |
| `MONGODB_URI` | `string` | `'mongodb://localhost:27017/whatsapp_saas_dev'` | Yes | MongoDB connection string. |
| `REDIS_URL` | `string` | `'redis://localhost:6379'` | Yes | Redis connection string for BullMQ queue listeners. |
| `LOG_LEVEL` | `enum` | `'info'` | No | Logger verbosity. |
| `CREDENTIAL_ENCRYPTION_KEY` | `string` | (configured) | **Yes** | 32-byte key to decrypt stored Meta tokens for worker dispatches. |

---

## 3. Frontend Web Application (`apps/web`)

| Variable | Type | Default | Required in Production | Description |
|---|---|---|---|---|
| `VITE_API_URL` | `string` | `'http://localhost:4000/api/v1'` | Yes | Target backend API base URL exposed to browser. |
| `VITE_APP_NAME` | `string` | `'Pingza'` | No | Platform branding display name. |
| `VITE_APP_ENV` | `string` | `'development'` | No | Frontend runtime environment flag. |
