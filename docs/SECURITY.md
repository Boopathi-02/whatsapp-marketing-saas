# Security Architecture & Safeguards (Phase 2 Implemented)

## 1. Authentication Security

### 1.1 Password Hashing with Argon2id
- **Algorithm**: `Argon2id` (the winner of the Password Hashing Competition, resistant to GPU/ASIC and side-channel attacks).
- **Parameters**:
  - Memory cost: 65,536 KiB (64 MiB)
  - Iterations (time cost): 3
  - Parallelism: 4 threads
- **Salt**: 16 cryptographically secure pseudo-random bytes generated per hash.
- **Verification**: Constant-time verification preventing timing side-channel attacks.

### 1.2 Dual-Token Session Architecture
- **Access Tokens**: Short-lived JWTs signed with `HS256` (`JWT_ACCESS_EXPIRES_IN`, default: 15 minutes).
  - Never stored in `localStorage` in the frontend client. Held in React memory state (`AuthContext`).
  - Carries minimal non-sensitive identity claims (`sub: userId`, `email`, `displayName`).
- **Refresh Tokens**: Cryptographically random 40-byte tokens (`crypto.randomBytes(40).toString('hex')`).
  - **Never stored in plaintext** in the database. Only SHA-256 hashes are persisted (`tokenHash`).
  - Stored in browser via `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies.
  - Browser JavaScript cannot access or exfiltrate the refresh token (`HttpOnly`).

### 1.3 Refresh Token Rotation & Reuse Detection
- **Token Lineage / Families**: Every refresh token belongs to a `tokenFamily` (UUID v4).
- **Rotation**: On each refresh request:
  1. The presented refresh token hash is matched against active database sessions.
  2. If valid, the current session is marked as rotated/consumed.
  3. A new refresh token is issued under the same `tokenFamily` with updated expiry.
  4. A new access token is returned.
- **Reuse Attack Detection**:
  - If a previously consumed or revoked refresh token is presented, the system detects a token theft / replay attack.
  - **Immediate Revocation**: The server immediately revokes **all** sessions belonging to that entire `tokenFamily`.
  - The attacker and the victim are both forced to re-authenticate, neutralizing the stolen session.

### 1.4 Single-Use Cryptographic Tokens
- **Email Verification Tokens**: 32-byte cryptographically random tokens, hashed with SHA-256 before storage, valid for 24 hours. Marked as used upon verification.
- **Password Reset Tokens**: 32-byte random tokens, hashed with SHA-256, valid for 1 hour. Single-use only.
  - **Account Security Event**: Resetting a password automatically revokes all existing user sessions across all devices.
  - **Generic Responses**: `POST /auth/forgot-password` returns identical success messages regardless of whether the email is registered, completely preventing user enumeration.

### 1.5 Rate Limiting
- Applied on `/api/v1/auth/*` sensitive routes (`authRateLimiter`).
- Window: 15 minutes, Maximum: 30 requests per IP address.
- Returns standardized `429 RATE_LIMIT_EXCEEDED` response envelope.

---

## 2. Strict Multi-Tenant Isolation & Authorization

Multi-tenant isolation is enforced through server-side authorization middleware, not developer discipline or UI hiding.

### 2.1 Workspace Resolution Middleware (`requireWorkspace`)
For every workspace-owned route:
1. **Authentication**: `requireAuth` verifies the Bearer JWT token, ensures the user account exists, and checks that the account is active (`401 UNAUTHORIZED` / `403 FORBIDDEN`).
2. **Resolution**: Resolves target `workspaceId` from path parameters (`req.params.workspaceId`), HTTP header (`X-Workspace-Id`), or request body.
3. **Validation**: Verifies that the workspace exists and is active (`404 NOT_FOUND`).
4. **Membership Verification**: Queries `WorkspaceMemberModel` for `{ workspaceId, userId, status: 'active' }`. If absent, immediately returns `403 FORBIDDEN`.
5. **Role Hierarchy Enforcement**: Validates that the member's role satisfies the endpoint's minimum rank (`ROLE_RANKS: owner (4) > admin (3) > member (2) > viewer (1)`).
6. **Context Injection**: Sets `req.workspace` and `req.membership`.

### 2.2 IDOR (Insecure Direct Object Reference) Protection
- Customer A cannot access Customer B's workspace data simply by guessing or replacing a workspace ID in the URL.
- Every endpoint explicitly scopes database operations with the verified `workspaceId`.
- Verified by automated integration tests (`tenant_isolation.integration.test.ts`).

### 2.3 Role-Based Access Control (RBAC) Matrix

| Operation | Required Role | Owner | Admin | Member | Viewer |
| :--- | :--- | :---: | :---: | :---: | :---: |
| View Workspace Details & Metrics | `viewer` | ✅ | ✅ | ✅ | ✅ |
| List Team Members | `viewer` | ✅ | ✅ | ✅ | ✅ |
| Update Workspace Name | `admin` | ✅ | ✅ | ❌ | ❌ |
| Invite New Team Members | `admin` | ✅ | ✅ | ❌ | ❌ |
| Change Member Roles | `admin` | ✅ | ✅ | ❌ | ❌ |
| Remove Team Member | `admin` | ✅ | ✅ | ❌ | ❌ |
| Transfer Workspace Ownership | `owner` | ✅ | ❌ | ❌ | ❌ |

### 2.4 Last-Owner Protection Invariant
- A workspace owner cannot be removed or demoted by an administrator.
- The sole remaining owner of a workspace cannot leave, demote themselves, or be deleted without first transferring ownership to another active member.
- Guarded by atomic checks in `WorkspaceRepository.updateMemberRole`, `WorkspaceRepository.removeMember`, and `WorkspaceRepository.transferOwnership`.

---

## 3. Defense-in-Depth & Sensitive Data Redaction

- **Pino Redaction**:
  - `req.headers.authorization`
  - `req.headers.cookie`
  - `res.headers["set-cookie"]`
  - `password`, `secret`, `token`, `accessToken`, `refreshToken`, `apiKey`
- **Helmet Security Headers**:
  - `Content-Security-Policy`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **Request Body Limits**: 1MB maximum payload size.
