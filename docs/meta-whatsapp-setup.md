# Meta Developer Dashboard Setup Guide for Pingza WhatsApp SaaS

This guide provides step-by-step instructions for configuring the Meta Developer Dashboard, Facebook Login for Business, WhatsApp Business Platform, and Webhooks for Pingza.

---

## 1. Prerequisites Checklist

Before beginning setup:
- [ ] A verified **Meta Business Account (Business Manager)**.
- [ ] A **Meta Developer Account** registered at [developers.facebook.com](https://developers.facebook.com).
- [ ] A public HTTPS domain for Webhooks (or a secure tunnel like `ngrok` / Cloudflare Tunnel for local testing).

---

## 2. Step 1: Create Meta App

1. Navigate to [Meta for Developers > My Apps](https://developers.facebook.com/apps).
2. Click **Create App**.
3. Select **Other** as the use case, then choose **Business** as the app type.
4. Fill in:
   - **App Name:** `Pingza Marketing Platform`
   - **App Contact Email:** `security@pingza.com`
   - **Business Account:** Select your verified Meta Business Account.
5. Click **Create app**.

---

## 3. Step 2: Add Products

In the App Dashboard left sidebar, click **Add Product**:
1. **WhatsApp:** Click **Set up**.
2. **Facebook Login for Business:** Click **Set up**.

---

## 4. Step 3: Configure WhatsApp Embedded Signup v4

Embedded Signup allows tenant administrators to onboard their WhatsApp Business Accounts without manually copying tokens:

1. Under **WhatsApp** in the left navigation, click **Quickstart**.
2. Scroll to the **Embedded Signup** section and click **Create Configuration**.
3. Configure the following permissions for your configuration:
   - `whatsapp_business_management` (Manage WABA, view phone numbers, subscribe webhooks)
   - `whatsapp_business_messaging` (Send & receive messages, templates)
4. Save the configuration. Meta will generate a **Configuration ID** (e.g., `123456789012345`).
5. Copy this ID and set it as `META_CONFIG_ID` in your `.env` file.

---

## 5. Step 4: Configure Webhooks

Meta sends incoming messages and message delivery receipts via Webhooks.

1. Under **WhatsApp** > **Configuration**, locate the **Webhooks** section.
2. Click **Edit**.
3. Provide:
   - **Callback URL:** `https://<your-domain>/api/v1/webhooks/whatsapp` (e.g., `https://api.pingza.com/api/v1/webhooks/whatsapp` or `https://xyz.ngrok-free.app/api/v1/webhooks/whatsapp`)
   - **Verify Token:** The exact value of `META_WEBHOOK_VERIFY_TOKEN` from your `.env` file.
4. Click **Verify and Save**. Meta will send a `GET` request with `hub.challenge` to verify your endpoint.
5. In the **Webhook fields** table, click **Manage** and subscribe to:
   - `messages` (Includes incoming text, media, button replies, and statuses `sent`, `delivered`, `read`, `failed`).

---

## 6. Step 5: Configure App Domains & Facebook Login

1. Under **App Settings** > **Basic**:
   - **App Domains:** Add your domain (e.g., `pingza.com`, `localhost`).
   - **Privacy Policy URL:** `https://pingza.com/privacy`
   - **Terms of Service URL:** `https://pingza.com/terms`
   - Note down **App ID** (`META_APP_ID`) and **App Secret** (`META_APP_SECRET`).
2. Under **Facebook Login for Business** > **Settings**:
   - **Client OAuth Login:** `Yes`
   - **Web OAuth Login:** `Yes`
   - **Valid OAuth Redirect URIs:** Add your frontend domain:
     - `http://localhost:3000`
     - `https://app.pingza.com`

---

## 7. Step 6: Test Numbers & Recipients (Development Mode)

While your Meta App is in **Development Mode**:
1. Meta provides a complimentary **Test Phone Number**.
2. Under **WhatsApp** > **API Setup**:
   - You can send test messages to up to 5 verified phone numbers.
   - Click **Manage phone number list** to add your personal WhatsApp number for testing.
3. Once verified, you can test message sending and receipt webhooks.

---

## 8. Step 7: App Review & Production Access (Going Live)

To allow any customer to connect their WhatsApp Business Account:
1. Complete **Business Verification** under Meta Business Settings > Security Center.
2. Go to **App Review** > **Permissions and Features**.
3. Request **Advanced Access** for:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. Provide a screen recording showing the Embedded Signup flow in Pingza.
5. Switch the app toggle in the top navbar from **In Development** to **Live**.
