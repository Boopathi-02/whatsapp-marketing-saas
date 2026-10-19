import {
  ContactRepository,
  IContact,
  CreateContactData,
  ListContactsOptions,
} from '@whatsapp-saas/database';
import {
  CreateContactRequest,
  UpdateContactRequest,
  ContactQuery,
  ContactDto,
  PaginatedContactsResponse,
  ImportContactsResult,
  ToggleSuppressionRequest,
} from '@whatsapp-saas/contracts';
import { ContactOptInStatus } from '@whatsapp-saas/domain';
import { normalizePhoneNumber } from '../../utils/phone.js';
import { parseContactsCsv, generateContactsCsv } from '../../utils/csv.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

export class ContactService {
  /**
   * Create a single contact in the tenant's directory.
   */
  async createContact(workspaceId: string, req: CreateContactRequest): Promise<ContactDto> {
    const normalized = normalizePhoneNumber(req.phoneNumber);
    if (!normalized.isValid) {
      throw new AppError(
        `Invalid phone number format: ${normalized.error || req.phoneNumber}`,
        422,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Check for duplicate in the same workspace
    const existing = await ContactRepository.findByPhone(workspaceId, normalized.e164);
    if (existing) {
      throw new AppError(
        `A contact with phone number ${normalized.e164} already exists in this workspace.`,
        409,
        ErrorCode.CONFLICT
      );
    }

    const contact = await ContactRepository.createContact({
      workspaceId,
      phoneNumber: normalized.e164,
      displayName: req.displayName,
      email: req.email || null,
      tags: req.tags || [],
      customFields: req.customFields || {},
      source: 'manual',
      consentStatus: req.consentStatus || ContactOptInStatus.PENDING,
      consentSource: req.consentSource || 'manual_entry',
    });

    return this.toDto(contact);
  }

  /**
   * List contacts with search, tag filters, consent filters, suppression status, and pagination.
   */
  async listContacts(workspaceId: string, query: ContactQuery): Promise<PaginatedContactsResponse> {
    const options: ListContactsOptions = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      tag: query.tag,
      consentStatus: query.consentStatus,
      isSuppressed: query.isSuppressed,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await ContactRepository.listPaginated(workspaceId, options);

    return {
      contacts: result.contacts.map(c => this.toDto(c)),
      pagination: result.pagination,
    };
  }

  /**
   * Retrieve a single contact by ID.
   */
  async getContact(workspaceId: string, contactId: string): Promise<ContactDto> {
    const contact = await ContactRepository.findById(workspaceId, contactId);
    if (!contact) {
      throw new AppError('Contact not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }
    return this.toDto(contact);
  }

  /**
   * Update an existing contact.
   */
  async updateContact(
    workspaceId: string,
    contactId: string,
    req: UpdateContactRequest
  ): Promise<ContactDto> {
    const contact = await ContactRepository.findById(workspaceId, contactId);
    if (!contact) {
      throw new AppError('Contact not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    // Protect against silent re-opt-in of opted-out contacts
    if (
      contact.consentStatus === ContactOptInStatus.OPTED_OUT &&
      req.consentStatus === ContactOptInStatus.OPTED_IN
    ) {
      if (!req.consentSource || req.consentSource.trim().length < 3) {
        throw new AppError(
          'Re-opting in an opted-out contact requires an explicit consentSource verifying customer consent.',
          400,
          ErrorCode.BAD_REQUEST
        );
      }
    }

    const updated = await ContactRepository.updateContact(workspaceId, contactId, {
      displayName: req.displayName,
      email: req.email,
      tags: req.tags,
      customFields: req.customFields,
      consentStatus: req.consentStatus,
      consentSource: req.consentSource,
    });

    if (!updated) {
      throw new AppError('Failed to update contact.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return this.toDto(updated);
  }

  /**
   * Toggle suppression status (opt-out / blocklist).
   */
  async toggleSuppression(
    workspaceId: string,
    contactId: string,
    req: ToggleSuppressionRequest
  ): Promise<ContactDto> {
    const contact = await ContactRepository.findById(workspaceId, contactId);
    if (!contact) {
      throw new AppError('Contact not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    const updated = await ContactRepository.toggleSuppression(
      workspaceId,
      contactId,
      req.isSuppressed,
      req.suppressionReason
    );

    if (!updated) {
      throw new AppError('Failed to update suppression status.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return this.toDto(updated);
  }

  /**
   * Delete contact from the workspace directory.
   */
  async deleteContact(workspaceId: string, contactId: string): Promise<void> {
    const contact = await ContactRepository.findById(workspaceId, contactId);
    if (!contact) {
      throw new AppError('Contact not found in this workspace.', 404, ErrorCode.NOT_FOUND);
    }

    await ContactRepository.deleteContact(workspaceId, contactId);
  }

  /**
   * Ingest contacts from CSV string or pre-parsed rows with validation and row limits.
   */
  async importContacts(
    workspaceId: string,
    options: {
      csvContent?: string;
      rows?: Array<{
        phoneNumber: string;
        displayName?: string;
        email?: string;
        tags?: string[];
        consentStatus?: ContactOptInStatus;
        consentSource?: string;
      }>;
    }
  ): Promise<ImportContactsResult> {
    let candidateRows: Array<{
      phoneNumber: string;
      displayName?: string;
      email?: string;
      tags?: string[];
      consentStatus?: ContactOptInStatus;
      consentSource?: string;
    }> = [];
    const errors: Array<{ rowNumber: number; reason: string }> = [];

    if (options.csvContent) {
      const parsed = parseContactsCsv(options.csvContent);
      errors.push(...parsed.errors);
      candidateRows = parsed.rows.map(r => ({
        phoneNumber: r.phoneNumber,
        displayName: r.displayName,
        email: r.email,
        tags: r.tags,
        consentStatus: (r.consentStatus as ContactOptInStatus) || ContactOptInStatus.PENDING,
        consentSource: r.consentSource || 'csv_import',
      }));
    } else if (options.rows) {
      candidateRows = options.rows;
    } else {
      throw new AppError('Either csvContent or rows array is required for contact import', 400, ErrorCode.BAD_REQUEST);
    }

    // Normalize and validate each candidate row
    const validData: CreateContactData[] = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 0; i < candidateRows.length; i++) {
      const row = candidateRows[i];
      const rowNumber = i + 2; // header accounted

      const normalized = normalizePhoneNumber(row.phoneNumber);
      if (!normalized.isValid) {
        errors.push({
          rowNumber,
          reason: `Invalid phone number: ${normalized.error || row.phoneNumber}`,
        });
        continue;
      }

      if (seenPhonesInBatch.has(normalized.e164)) {
        errors.push({
          rowNumber,
          reason: `Duplicate phone number in import batch: ${normalized.e164}`,
        });
        continue;
      }
      seenPhonesInBatch.add(normalized.e164);

      validData.push({
        workspaceId,
        phoneNumber: normalized.e164,
        displayName: row.displayName,
        email: row.email,
        tags: row.tags,
        source: 'csv_import',
        consentStatus: row.consentStatus || ContactOptInStatus.PENDING,
        consentSource: row.consentSource || 'csv_import',
      });
    }

    const { createdCount, updatedCount } = await ContactRepository.bulkUpsert(workspaceId, validData);

    return {
      totalProcessed: candidateRows.length,
      createdCount,
      updatedCount,
      failedCount: errors.length,
      errors,
    };
  }

  /**
   * Export contacts belonging strictly to the specified workspace as a CSV string.
   */
  async exportContactsCsv(
    workspaceId: string,
    filters: { tag?: string; consentStatus?: ContactOptInStatus; isSuppressed?: boolean } = {}
  ): Promise<string> {
    const contacts = await ContactRepository.exportContacts(workspaceId, filters);

    return generateContactsCsv(
      contacts.map(c => ({
        phoneNumber: c.phoneNumber,
        displayName: c.displayName,
        email: c.email || undefined,
        tags: c.tags,
        consentStatus: c.consentStatus,
        consentSource: c.consentSource || undefined,
        isSuppressed: c.isSuppressed,
        createdAt: c.createdAt,
      }))
    );
  }

  private toDto(contact: IContact): ContactDto {
    const doc = contact.toJSON() as { id?: string; workspaceId?: string };
    return {
      id: doc.id || contact._id.toString(),
      workspaceId: doc.workspaceId || contact.workspaceId.toString(),
      phoneNumber: contact.phoneNumber,
      displayName: contact.displayName,
      email: contact.email || null,
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      source: contact.source,
      consentStatus: contact.consentStatus,
      consentSource: contact.consentSource || null,
      consentTimestamp: contact.consentTimestamp ? contact.consentTimestamp.toISOString() : null,
      isSuppressed: contact.isSuppressed,
      suppressedAt: contact.suppressedAt ? contact.suppressedAt.toISOString() : null,
      suppressionReason: contact.suppressionReason || null,
      createdAt: contact.createdAt ? contact.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: contact.updatedAt ? contact.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const contactService = new ContactService();
