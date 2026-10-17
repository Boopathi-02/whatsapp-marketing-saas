# Security Architecture & Roadmap

## 1. Authentication Roadmap (Phase 2 Target)

In Phase 1, no mock or placeholder authentication is permitted. The planned authentication architecture for Phase 2 includes:

- **Tokens**: Dual-token pattern using short-lived JWT Access Tokens (15-minute expiry) and cryptographically random Refresh Tokens (7-day expiry) stored in HTTP-only, SameSite=Strict cookies.
- **Password Security**: Argon2id hashing with randomized per-user salts.
- **Session Revocation**: Refresh token rotation with family revocation on suspected reuse.
- **Multi-Factor Authentication (MFA)**: Time-based One-Time Password (TOTP) enforcement for administrative roles.

---

## 2. Server-Side Authorization & RBAC

- **Role Hierarchy**:
  - `owner`: Workspace administration, billing subscription management, team deletion.
  - `admin`: WABA connectivity, template creation, campaign dispatch, contact imports.
  - `member`: Campaign composition, template drafting, contact inspection.
  - `viewer`: Read-only reporting and delivery telemetry.
- **Principle of Non-Reliance on Client-Side Controls**: Hiding sidebar navigation items or disabling UI buttons provides zero security. Every mutation and query requires verified server-side middleware validation.

---

## 3. Secret Management & Credential Safety

- **Zero Hardcoded Secrets**: Production secrets are supplied strictly via environment variables or cloud secret managers (AWS Secrets Manager, GCP Secret Manager, Vault).
- **Vite Public Variable Isolation**: Backend secrets (`MONGODB_URI`, `REDIS_URL`, `META_APP_SECRET`, `STRIPE_SECRET_KEY`) must never be prefixed with `VITE_` or imported into `apps/web`.
- **At-Rest Encryption**: Meta permanent system user tokens and webhook secrets are stored encrypted in MongoDB using AES-256-GCM.

---

## 4. Sensitive Data Redaction in Logging

The structured Pino logger enforces automatic path-based redaction:
- `req.headers.authorization`
- `req.headers.cookie`
- `res.headers["set-cookie"]`
- `password`, `secret`, `token`, `accessToken`, `refreshToken`, `apiKey`
- MongoDB connection credentials sanitized via `sanitizeMongoUri` before logging.

---

## 5. Defense-in-Depth HTTP Protections

- **Helmet**: Disables MIME-type sniffing, adds strict Referrer-Policy, frameguard (`X-Frame-Options: SAMEORIGIN`), and Content Security Policy directives.
- **CORS**: Restricted strictly to authorized origins defined in `WEB_ORIGIN`.
- **Payload Limits**: Request bodies capped at 1MB to prevent memory exhaustion attacks.
- **Correlation Tracking**: Each request receives an `X-Request-Id` for end-to-end security auditability across microservices.
