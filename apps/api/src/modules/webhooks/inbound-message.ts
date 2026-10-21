/**
 * Pure parsing of Meta Cloud API inbound messages into the shape we store.
 * No I/O here so every message type can be unit tested.
 */

export interface MetaInboundMessage {
  id: string;
  from: string;
  type?: string;
  timestamp?: string;
  context?: { from?: string; id?: string };
  referral?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ParsedInboundMessage {
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  /** Present for reactions: these annotate an existing message instead of creating one. */
  reaction?: { targetMetaMessageId: string; emoji: string | null };
}

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function parseInboundMessage(msg: MetaInboundMessage): ParsedInboundMessage {
  const type = msg.type || 'text';
  const metadata: Record<string, unknown> = {};

  if (msg.context?.id) {
    metadata.replyTo = { metaMessageId: msg.context.id, from: msg.context.from };
  }
  if (msg.referral && typeof msg.referral === 'object') {
    // Click-to-WhatsApp ad / post referral
    const r = msg.referral;
    metadata.referral = {
      sourceUrl: str(r.source_url),
      sourceId: str(r.source_id),
      sourceType: str(r.source_type),
      headline: str(r.headline),
      body: str(r.body),
      ctwaClid: str(r.ctwa_clid),
    };
  }

  if (type === 'reaction') {
    const r = (msg.reaction ?? {}) as { message_id?: string; emoji?: string };
    return {
      type,
      content: r.emoji ?? '',
      metadata,
      reaction: r.message_id ? { targetMetaMessageId: r.message_id, emoji: r.emoji || null } : undefined,
    };
  }

  if (type === 'text') {
    return { type, content: (msg.text as { body?: string } | undefined)?.body ?? '', metadata };
  }

  if (type === 'button') {
    const b = (msg.button ?? {}) as { text?: string; payload?: string };
    metadata.buttonPayload = b.payload;
    return { type, content: b.text ?? '', metadata };
  }

  if (type === 'interactive') {
    const i = (msg.interactive ?? {}) as {
      type?: string;
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string; description?: string };
    };
    const reply = i.button_reply ?? i.list_reply;
    metadata.interactiveType = i.type;
    metadata.replyId = reply?.id;
    return { type: `interactive_${i.type ?? 'reply'}`, content: reply?.title ?? reply?.id ?? '', metadata };
  }

  if ((MEDIA_TYPES as readonly string[]).includes(type)) {
    const m = (msg[type] ?? {}) as {
      id?: string;
      mime_type?: string;
      caption?: string;
      filename?: string;
      sha256?: string;
    };
    // Cloud API delivers a media *id*; the bytes must be fetched with the account token.
    metadata.media = { id: m.id, mimeType: m.mime_type, filename: m.filename, sha256: m.sha256 };
    return { type, content: m.caption || `[${type.toUpperCase()}]`, metadata };
  }

  if (type === 'location') {
    const l = (msg.location ?? {}) as { latitude?: number; longitude?: number; name?: string; address?: string };
    metadata.location = { latitude: l.latitude, longitude: l.longitude, name: l.name, address: l.address };
    const label = [l.name, l.address].filter(Boolean).join(', ');
    return { type, content: label ? `[LOCATION] ${label}` : '[LOCATION]', metadata };
  }

  if (type === 'contacts') {
    const contacts = Array.isArray(msg.contacts)
      ? (msg.contacts as Array<{ name?: { formatted_name?: string }; phones?: Array<{ phone?: string }> }>)
      : [];
    metadata.sharedContacts = contacts.map(c => ({
      name: c.name?.formatted_name,
      phones: (c.phones ?? []).map(p => p.phone).filter(Boolean),
    }));
    const names = contacts.map(c => c.name?.formatted_name).filter(Boolean);
    return { type, content: names.length ? `[CONTACT] ${names.join(', ')}` : '[CONTACT]', metadata };
  }

  return { type, content: `[${type.toUpperCase()}]`, metadata };
}

export interface MetaStatusError {
  code?: number;
  title?: string;
  message?: string;
}

/** Joins the useful parts of a Meta status error without storing the raw error object. */
export function describeStatusError(errors: MetaStatusError[] | undefined): { code?: number; message: string } | null {
  const e = errors?.[0];
  if (!e) return null;
  return { code: e.code, message: e.message || e.title || 'Delivery failed' };
}

/** Meta error 131026: the recipient is not on WhatsApp (or cannot receive this message). */
export const ERROR_RECIPIENT_NOT_REACHABLE = 131026;
