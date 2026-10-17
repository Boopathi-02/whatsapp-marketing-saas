# Database Architecture & Specification

## 1. Connection Lifecycle & Management

The shared database layer (`@whatsapp-saas/database`) manages MongoDB connectivity using **Mongoose**:

- **Credential Redaction**: Connection URIs are sanitized before logging; passwords and usernames are never written to stdout, files, or telemetry.
- **Connection Pooling**: Configurable `minPoolSize` (default: 2) and `maxPoolSize` (default: 10) optimize socket utilization under concurrent API requests.
- **Resilient Startup**: If MongoDB is offline at application boot in development mode, the server logs a warning and enters degraded mode instead of unhandled crash loops.
- **Graceful Termination**: On `SIGINT` or `SIGTERM`, active transactions and sockets are cleanly drained before process exit.
- **Active Readiness Probing**: The readiness probe executes a real `adminCommand({ ping: 1 })` to verify socket responsiveness before reporting healthy.
- **Transaction Support with Safe Fallback**: Multi-document transactions (`session.startTransaction()`) are utilized for atomic operations (workspace provisioning, ownership transfer, invitation acceptance). If running against a standalone MongoDB node that lacks replica sets, the repositories automatically detect this and execute sequential operations with compensation rollbacks.

---

## 2. Active Collections & Schemas (Phase 2 Implemented)

### 1. `users` (`UserModel`)
- System user accounts, credentials, and global profile metadata.
- **Fields**:
  - `_id`: `ObjectId` (primary key)
  - `email`: `String` (lowercase, trimmed, unique)
  - `passwordHash`: `String` (Argon2id cryptographic hash)
  - `displayName`: `String` (trimmed)
  - `accountStatus`: `'active' | 'suspended' | 'pending_verification'` (default: `'active'`)
  - `emailVerified`: `Boolean` (default: `false`)
  - `emailVerifiedAt`: `Date | null`
  - `lastLoginAt`: `Date | null`
  - `createdAt`, `updatedAt`: `Date` (timestamps)
- **Indexes**:
  - `{ email: 1 }` (unique)
  - `{ accountStatus: 1 }`
  - `{ emailVerified: 1 }`
- **Security**: The `toJSON` transform automatically strips `passwordHash` and `__v` while exposing a normalized `id` string.

### 2. `workspaces` (`WorkspaceModel`)
- Primary multi-tenant boundary for customer businesses.
- **Fields**:
  - `_id`: `ObjectId`
  - `name`: `String` (max 100 chars, trimmed)
  - `slug`: `String` (lowercase, trimmed, unique)
  - `ownerId`: `ObjectId` (references `User`)
  - `status`: `'active' | 'suspended' | 'archived'` (default: `'active'`)
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ slug: 1 }` (unique)
  - `{ ownerId: 1, status: 1 }`

### 3. `workspace_members` (`WorkspaceMemberModel`)
- User membership, roles, and status within workspaces.
- **Fields**:
  - `_id`: `ObjectId`
  - `workspaceId`: `ObjectId` (references `Workspace`)
  - `userId`: `ObjectId` (references `User`)
  - `role`: `'owner' | 'admin' | 'member' | 'viewer'`
  - `status`: `'active' | 'suspended'` (default: `'active'`)
  - `invitedBy`: `ObjectId | null` (references `User`)
  - `joinedAt`: `Date`
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ workspaceId: 1, userId: 1 }` (unique compound index — guarantees one membership per user per workspace)
  - `{ workspaceId: 1, role: 1 }`
  - `{ userId: 1, status: 1 }`

### 4. `workspace_invitations` (`WorkspaceInvitationModel`)
- Workspace email invitations with single-use expiring cryptographic tokens.
- **Fields**:
  - `_id`: `ObjectId`
  - `workspaceId`: `ObjectId` (references `Workspace`)
  - `email`: `String` (lowercase, trimmed)
  - `role`: `'owner' | 'admin' | 'member' | 'viewer'`
  - `invitedBy`: `ObjectId` (references `User`)
  - `tokenHash`: `String` (SHA-256 hash of raw token)
  - `status`: `'pending' | 'accepted' | 'rejected' | 'expired'`
  - `expiresAt`: `Date` (default: 7 days)
  - `acceptedAt`: `Date | null`
  - `rejectedAt`: `Date | null`
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ tokenHash: 1 }` (unique)
  - `{ workspaceId: 1, email: 1, status: 1 }`
  - `{ expiresAt: 1 }` (TTL index)

### 5. `sessions` (`SessionModel`)
- Server-side active session store with refresh token rotation and reuse detection metadata.
- **Fields**:
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (references `User`)
  - `tokenHash`: `String` (SHA-256 hash of raw refresh token)
  - `tokenFamily`: `String` (UUID v4 identifying the token lineage)
  - `isRevoked`: `Boolean` (default: `false`)
  - `revokedAt`: `Date | null`
  - `revocationReason`: `String | null`
  - `expiresAt`: `Date` (default: 7 days)
  - `userAgent`: `String | undefined`
  - `ipAddress`: `String | undefined`
  - `lastUsedAt`: `Date`
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ tokenHash: 1 }` (index)
  - `{ tokenFamily: 1 }` (index)
  - `{ userId: 1, isRevoked: 1 }` (compound index)
  - `{ expiresAt: 1 }` (TTL index)

### 6. `email_verification_tokens` (`EmailVerificationTokenModel`)
- Single-use tokens for user email address verification.
- **Fields**:
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (references `User`)
  - `tokenHash`: `String` (SHA-256 hash)
  - `expiresAt`: `Date` (default: 24 hours)
  - `usedAt`: `Date | null`
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ tokenHash: 1 }` (unique)
  - `{ userId: 1, usedAt: 1 }`
  - `{ expiresAt: 1 }` (TTL index)

### 7. `password_reset_tokens` (`PasswordResetTokenModel`)
- Single-use tokens for password recovery.
- **Fields**:
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (references `User`)
  - `tokenHash`: `String` (SHA-256 hash)
  - `expiresAt`: `Date` (default: 1 hour)
  - `usedAt`: `Date | null`
  - `createdAt`, `updatedAt`: `Date`
- **Indexes**:
  - `{ tokenHash: 1 }` (unique)
  - `{ userId: 1, usedAt: 1 }`
  - `{ expiresAt: 1 }` (TTL index)

---

## 3. Upcoming Collections (Phase 3 & 4 Planned)

- `whatsapp_accounts`: Official Meta WABA credentials and access tokens.
- `contacts`: Customer contact phone directory, opt-in consent states, and audience tags.
- `message_templates`: Synchronized WhatsApp approved templates from Meta Graph API.
- `campaigns`: WhatsApp broadcasts and scheduling.
- `messages`: Message dispatch logs, Meta message IDs, and delivery telemetry.

---

## 4. Tenant Query Scoping & Protection

To safeguard against multi-tenant data contamination:
1. Every query executed on a tenant resource MUST resolve through `requireWorkspace(minRole)` middleware.
2. Repositories enforce explicit workspace filtering (`{ workspaceId: new Types.ObjectId(workspaceId) }`).
3. Cross-tenant access is rejected with `403 FORBIDDEN` before reaching any business logic.
4. Mongoose models use strict schemas with compound uniqueness constraints to prevent concurrent race conditions.
