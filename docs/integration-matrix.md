# Integration Matrix: `whatsapp-server` -> `Pingza`

## 1. Subsystem Mapping

This matrix maps every relevant feature from the source repository (`D:\whatsapp-server`) to its target destination in Pingza (`D:\personal\we sender`), detailing package boundaries, database schema changes, API routes, security controls, and tests.

---

## 2. Feature-by-Feature Integration Plan

### A. Message Template Management & Dynamic Parameter Mapping
- **Source Artifacts:** `controllers/template/templateController.js`, `models/template/templateSchema.js`, `validations/template/templateValidation.js`, `routes/template/templateRoutes.js`.
- **Existing Target Status:** Planned boundary (`apps/api/src/modules/templates/index.ts`, empty UI placeholder).
- **Target Changes:**
  - `packages/domain/src/index.ts`: Ensure `TemplateCategory`, `TemplateStatus`, `MessageTemplate` are exported.
  - `packages/contracts/src/template.ts`: Create Zod schemas for template creation (`CreateTemplateSchema`), listing, parameter validation, and syncing.
  - `packages/database/src/models/template.model.ts`: Create `MessageTemplateModel` with workspace scoping, compound unique index on `{ workspaceId: 1, name: 1, language: 1 }`.
  - `packages/database/src/repositories/template.repository.ts`: Add `create`, `findById`, `findByWorkspace`, `updateStatus`, `delete` methods.
  - `packages/whatsapp-adapter/src/index.ts`: Add `createTemplate`, `deleteTemplate`, `fetchTemplates` methods to `WhatsAppAdapter`.
  - `apps/api/src/modules/templates/`: Implement `template.service.ts`, `template.controller.ts`, and `template.routes.ts`.
  - `apps/web/src/features/templates/pages/TemplatesPage.tsx`: Full interactive MUI interface for authoring, listing, status badges, variable preview, and deletion.
- **Security & Tenant Isolation:**
  - Admin+ role required for creating/editing/deleting templates.
  - WABA ID and Meta access token retrieved from workspace's encrypted credentials.
  - Rejection of cross-workspace access (`403 FORBIDDEN`).
- **Tests:** Unit tests for parameter parsing; integration tests for template creation, syncing, RBAC, and tenant isolation.

---

### B. Broadcast Campaigns & Asynchronous Queue Dispatching
- **Source Artifacts:** `cron.js`, `services/whatsappService.js`, `controllers/message/message.js`.
- **Existing Target Status:** Empty placeholder module (`apps/api/src/modules/campaigns/index.ts`, placeholder UI).
- **Target Changes:**
  - `packages/contracts/src/campaign.ts`: Create Zod schemas for campaign creation (`CreateCampaignSchema`), scheduling, and query filtering.
  - `packages/database/src/models/campaign.model.ts`: Create `CampaignModel` and `CampaignRecipientModel` tracking delivery status per recipient.
  - `packages/database/src/repositories/campaign.repository.ts`: Repository for atomic counter increments (`sentCount`, `deliveredCount`, `failedCount`).
  - `apps/api/src/modules/campaigns/`: Implement `campaign.service.ts`, `campaign.controller.ts`, and `campaign.routes.ts`.
  - `apps/worker/src/queues/campaign.queue.ts` & `apps/worker/src/processors/campaign.processor.ts`: Durable job processing with throttling and retry backoff.
  - `apps/web/src/features/campaigns/pages/CampaignsPage.tsx`: Interactive dashboard for creating campaigns, audience segment selection, template picker, schedule picker, progress bars, and analytics.
- **Security & Reliability:**
  - **Strict Consent Enforcement:** Verifies recipient `optInStatus === 'opted_in'` and `isSuppressed !== true` immediately before dispatch.
  - **Idempotency:** Unique compound index `{ campaignId: 1, recipientPhoneNumber: 1 }` prevents double-sending.
- **Tests:** Campaign creation, consent filtering, worker retry handling, tenant isolation.

---

### C. Live Conversations, Messages & Real-Time Inbox
- **Source Artifacts:** `controllers/conversation/conversationController.js`, `controllers/message/message.js`, `models/conversation/conversationSchema.js`, `models/message/messageSchema.js`, `socket.js`.
- **Existing Target Status:** None (previously focused on account onboarding and contact directory).
- **Target Changes:**
  - `packages/contracts/src/conversation.ts`: Schemas for listing conversations, sending text/media/location messages, reactions, read status updates.
  - `packages/database/src/models/conversation.model.ts` & `message.model.ts`: Multi-tenant schemas with workspace and contact indices.
  - `packages/database/src/repositories/conversation.repository.ts`: Thread updates, unread count aggregation, pagination.
  - `apps/api/src/modules/conversations/`: Full REST endpoints (`GET /conversations`, `POST /conversations/:id/messages`, `POST /messages/:id/reactions`).
  - `apps/api/src/modules/webhooks/webhook.service.ts`: Automatically record inbound customer messages into conversation threads.
- **Security:**
  - User can only access conversations within their authorized workspace.
- **Tests:** Thread creation, inbound message persistence, reaction tracking, tenant boundaries.

---

### D. Quick Replies Management
- **Source Artifacts:** `controllers/QuickReplies/quickRepliesController.js`, `models/QuickReplies/quickRepliesSchema.js`, `routes/QuickReplies/quickRepliesRoutes.js`.
- **Existing Target Status:** None.
- **Target Changes:**
  - `packages/contracts/src/quick-reply.ts`: Zod schemas for quick reply CRUD and dynamic parameter substitution.
  - `packages/database/src/models/quick_reply.model.ts`: Multi-tenant schema with shortcut name and message content.
  - `apps/api/src/modules/quick-replies/`: REST routes and service.
- **Security:** Scoped strictly by workspace ID with Admin+ permissions for modifying.

---

### E. WhatsApp Business Profile Management
- **Source Artifacts:** `controllers/channel/channelController.js` (`channelProfile`, `updatechannelProfile`).
- **Existing Target Status:** Only phone details & WABA details fetched during account sync.
- **Target Changes:**
  - `packages/whatsapp-adapter/src/index.ts`: Add `fetchBusinessProfile` and `updateBusinessProfile` to `WhatsAppAdapter`.
  - `apps/api/src/modules/whatsapp/whatsapp.service.ts`: Add profile endpoints using decrypted credentials.
  - `apps/api/src/modules/whatsapp/whatsapp.routes.ts`: `GET /:accountId/profile` and `PATCH /:accountId/profile`.
- **Security:** Access tokens never exposed to client; profile updates authenticated server-side.

---

### F. Chatbot Flow Automation Engine
- **Source Artifacts:** `controllers/flow/chatbotFlowController.js`, `services/chatbotService.js`, `models/chatbot/chatbotSchema.js`.
- **Existing Target Status:** None.
- **Target Changes:**
  - `packages/contracts/src/chatbot.ts`: Schemas for chatbot flow creation and activation.
  - `packages/database/src/models/chatbot.model.ts`: Multi-tenant schema storing visual node graph and keyword triggers.
  - `apps/api/src/modules/chatbots/`: Management endpoints.
  - `apps/api/src/modules/webhooks/webhook.service.ts`: Trigger active chatbot flow on incoming customer message matching keywords.

---

## 3. Implementation Phases & Milestones

1. **Contracts & Domain Foundations:**
   - Update `packages/domain/src/index.ts` with required entities.
   - Implement `packages/contracts/src/template.ts`, `campaign.ts`, `conversation.ts`, `quick-reply.ts`, `chatbot.ts`.
2. **Database Models & Persistence:**
   - Implement `MessageTemplateModel`, `CampaignModel`, `ConversationModel`, `MessageModel`, `QuickReplyModel`, `ChatbotModel` in `packages/database`.
3. **WhatsApp Adapter & Backend Services:**
   - Extend `MetaWhatsAppCloudAdapter` & `MockWhatsAppAdapter`.
   - Implement services, controllers, and routes in `apps/api/src/modules/`.
   - Update `webhook.service.ts` to route inbound messages into conversations and trigger chatbot automations.
4. **Frontend Workflows:**
   - Implement rich Material UI interfaces in `TemplatesPage.tsx`, `CampaignsPage.tsx`, and Inbox views.
5. **Testing & Verification:**
   - Unit tests, integration tests with mocked adapters, type checking, linting, and build verification.
