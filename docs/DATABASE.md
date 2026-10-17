# Database Architecture & Specification

## 1. Connection Lifecycle & Management

The shared database layer (`@whatsapp-saas/database`) manages MongoDB connectivity using **Mongoose**:

- **Credential Redaction**: Connection URIs are sanitized before logging; passwords and usernames are never written to stdout, files, or telemetry.
- **Connection Pooling**: Configurable `minPoolSize` (default: 2) and `maxPoolSize` (default: 10) optimize socket utilization under concurrent API requests.
- **Resilient Startup**: If MongoDB is offline at application boot in development mode, the server logs a warning and enters degraded mode instead of unhandled crash loops.
- **Graceful Termination**: On `SIGINT` or `SIGTERM`, active transactions and sockets are cleanly drained before process exit.
- **Active Readiness Probing**: The readiness probe executes a real `adminCommand({ ping: 1 })` to verify socket responsiveness before reporting healthy.

---

## 2. Planned Collections & Schemas

### 1. `users`
- System user accounts, credentials, and global profile metadata.
- **Fields**: `_id`, `email`, `passwordHash`, `name`, `status`, `createdAt`, `updatedAt`.
- **Indexes**: `{ email: 1 }` (unique).

### 2. `workspaces` (Tenants)
- Primary multi-tenant boundary.
- **Fields**: `_id`, `name`, `slug`, `ownerUserId`, `tier`, `createdAt`, `updatedAt`.
- **Indexes**: `{ slug: 1 }` (unique), `{ ownerUserId: 1 }`.

### 3. `workspace_members`
- User membership and role assignments within workspaces.
- **Fields**: `_id`, `workspaceId`, `userId`, `role` (`owner`, `admin`, `member`, `viewer`), `invitedAt`, `joinedAt`.
- **Indexes**: `{ workspaceId: 1, userId: 1 }` (unique compound index).

### 4. `whatsapp_accounts`
- Official Meta WhatsApp Business Account (WABA) credentials.
- **Fields**: `_id`, `workspaceId`, `phoneNumberId`, `wabaId`, `displayName`, `displayPhoneNumber`, `status`, `qualityRating`, `accessTokenEncrypted`.
- **Indexes**: `{ workspaceId: 1, phoneNumberId: 1 }` (unique), `{ workspaceId: 1, status: 1 }`.

### 5. `contacts`
- Customer phone directory and opt-in consent states.
- **Fields**: `_id`, `workspaceId`, `phoneNumber` (E.164), `firstName`, `lastName`, `optInStatus` (`opted_in`, `opted_out`, `pending`), `tags`, `customAttributes`.
- **Indexes**: `{ workspaceId: 1, phoneNumber: 1 }` (unique compound), `{ workspaceId: 1, optInStatus: 1 }`, `{ workspaceId: 1, tags: 1 }`.

### 6. `message_templates`
- WhatsApp approved templates synchronized from Meta Graph API.
- **Fields**: `_id`, `workspaceId`, `metaTemplateId`, `name`, `language`, `category`, `status`, `components`.
- **Indexes**: `{ workspaceId: 1, name: 1, language: 1 }` (unique compound).

### 7. `campaigns`
- Broadcast batches, audience selection, and high-level execution status.
- **Fields**: `_id`, `workspaceId`, `name`, `templateId`, `whatsAppAccountId`, `status`, `recipientCount`, `sentCount`, `deliveredCount`, `readCount`, `failedCount`, `scheduledAt`, `completedAt`.
- **Indexes**: `{ workspaceId: 1, status: 1, scheduledAt: 1 }`, `{ workspaceId: 1, createdAt: -1 }`.

### 8. `messages`
- Individual dispatched message logs with Meta message IDs.
- **Fields**: `_id`, `workspaceId`, `campaignId`, `contactId`, `metaMessageId`, `recipientPhoneNumber`, `status`, `cost`, `errorDetails`, `sentAt`, `deliveredAt`, `readAt`.
- **Indexes**: `{ metaMessageId: 1 }` (sparse unique), `{ workspaceId: 1, campaignId: 1, status: 1 }`, `{ workspaceId: 1, createdAt: -1 }`.

---

## 3. Tenant Query Scoping & Protection

To safeguard against multi-tenant data contamination:
1. Every query executed on a tenant collection MUST include the `workspaceId` condition.
2. The `multiTenantPlugin` automatically injects `workspaceId` as an immutable field on schemas.
3. The helper function `scopeToWorkspace(filter, workspaceId)` programmatically ensures the clause is present.
