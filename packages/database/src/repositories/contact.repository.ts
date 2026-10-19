import { Types, FilterQuery } from 'mongoose';
import { ContactModel, IContact } from '../models/contact.model.js';
import { ContactOptInStatus } from '@whatsapp-saas/domain';

export interface CreateContactData {
  workspaceId: string;
  phoneNumber: string;
  displayName?: string;
  email?: string | null;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
  source?: 'manual' | 'csv_import' | 'webhook' | 'api';
  consentStatus?: ContactOptInStatus;
  consentSource?: string | null;
  consentTimestamp?: Date | null;
}

export interface UpdateContactData {
  displayName?: string;
  email?: string | null;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
  consentStatus?: ContactOptInStatus;
  consentSource?: string | null;
}

export interface ListContactsOptions {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  consentStatus?: ContactOptInStatus;
  isSuppressed?: boolean;
  sortBy?: 'createdAt' | 'displayName' | 'phoneNumber' | 'consentStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedContacts<T> {
  contacts: T[];
  pagination: {
    page: number;
    limit: number;
    totalContacts: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ContactRepository {
  /**
   * Create a new contact scoped to a specific workspace.
   */
  static async createContact(data: CreateContactData): Promise<IContact> {
    const contact = await ContactModel.create({
      workspaceId: new Types.ObjectId(data.workspaceId),
      phoneNumber: data.phoneNumber.trim(),
      displayName: data.displayName?.trim(),
      email: data.email?.trim()?.toLowerCase() || null,
      tags: data.tags || [],
      customFields: data.customFields || {},
      source: data.source || 'manual',
      consentStatus: data.consentStatus || ContactOptInStatus.PENDING,
      consentSource: data.consentSource || null,
      consentTimestamp:
        data.consentStatus === ContactOptInStatus.OPTED_IN
          ? data.consentTimestamp || new Date()
          : null,
      isSuppressed: false,
    });

    return contact;
  }

  /**
   * Find a contact by ID within a workspace.
   */
  static async findById(workspaceId: string, contactId: string): Promise<IContact | null> {
    if (!Types.ObjectId.isValid(contactId)) return null;

    return ContactModel.findOne({
      _id: new Types.ObjectId(contactId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
  }

  /**
   * Find a contact by phone number within a workspace.
   */
  static async findByPhone(workspaceId: string, phoneNumber: string): Promise<IContact | null> {
    return ContactModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      phoneNumber: phoneNumber.trim(),
    });
  }

  /**
   * List contacts with search, filtering, and pagination scoped to a workspace.
   */
  static async listPaginated(
    workspaceId: string,
    options: ListContactsOptions = {}
  ): Promise<PaginatedContacts<IContact>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IContact> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (options.isSuppressed !== undefined) {
      filter.isSuppressed = options.isSuppressed;
    }

    if (options.consentStatus) {
      filter.consentStatus = options.consentStatus;
    }

    if (options.tag) {
      filter.tags = options.tag;
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { phoneNumber: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
      ];
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [contacts, totalContacts] = await Promise.all([
      ContactModel.find(filter).sort(sort).skip(skip).limit(limit),
      ContactModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalContacts / limit) || 1;

    return {
      contacts,
      pagination: {
        page,
        limit,
        totalContacts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Update contact properties.
   */
  static async updateContact(
    workspaceId: string,
    contactId: string,
    updateData: UpdateContactData
  ): Promise<IContact | null> {
    if (!Types.ObjectId.isValid(contactId)) return null;

    const setFields: Record<string, unknown> = {};

    if (updateData.displayName !== undefined) {
      setFields.displayName = updateData.displayName.trim();
    }
    if (updateData.email !== undefined) {
      setFields.email = updateData.email ? updateData.email.trim().toLowerCase() : null;
    }
    if (updateData.tags !== undefined) {
      setFields.tags = updateData.tags;
    }
    if (updateData.customFields !== undefined) {
      setFields.customFields = updateData.customFields;
    }
    if (updateData.consentStatus !== undefined) {
      setFields.consentStatus = updateData.consentStatus;
      if (updateData.consentStatus === ContactOptInStatus.OPTED_IN) {
        setFields.consentTimestamp = new Date();
      }
    }
    if (updateData.consentSource !== undefined) {
      setFields.consentSource = updateData.consentSource;
    }

    return ContactModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(contactId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      { $set: setFields },
      { new: true }
    );
  }

  /**
   * Toggle suppression status with audit metadata.
   */
  static async toggleSuppression(
    workspaceId: string,
    contactId: string,
    isSuppressed: boolean,
    suppressionReason?: string
  ): Promise<IContact | null> {
    if (!Types.ObjectId.isValid(contactId)) return null;

    return ContactModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(contactId),
        workspaceId: new Types.ObjectId(workspaceId),
      },
      {
        $set: {
          isSuppressed,
          suppressedAt: isSuppressed ? new Date() : null,
          suppressionReason: isSuppressed ? suppressionReason || 'User or agent suppression' : null,
        },
      },
      { new: true }
    );
  }

  /**
   * Delete contact from workspace directory.
   */
  static async deleteContact(workspaceId: string, contactId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(contactId)) return false;

    const res = await ContactModel.deleteOne({
      _id: new Types.ObjectId(contactId),
      workspaceId: new Types.ObjectId(workspaceId),
    });
    return res.deletedCount > 0;
  }

  /**
   * Bulk upsert contacts (used for CSV imports).
   * Prevents duplicates within the workspace, isolates across workspaces, and returns created/updated counts.
   */
  static async bulkUpsert(
    workspaceId: string,
    contacts: CreateContactData[]
  ): Promise<{ createdCount: number; updatedCount: number }> {
    if (contacts.length === 0) return { createdCount: 0, updatedCount: 0 };

    const workspaceObjectId = new Types.ObjectId(workspaceId);
    let createdCount = 0;
    let updatedCount = 0;

    for (const c of contacts) {
      const existing = await ContactModel.findOne({
        workspaceId: workspaceObjectId,
        phoneNumber: c.phoneNumber.trim(),
      });

      if (existing) {
        const updateDoc: Record<string, unknown> = {};
        if (c.displayName) updateDoc.displayName = c.displayName.trim();
        if (c.email) updateDoc.email = c.email.trim().toLowerCase();
        if (c.tags && c.tags.length > 0) {
          // Merge unique tags
          updateDoc.tags = Array.from(new Set([...existing.tags, ...c.tags]));
        }
        // CONSENT & SUPPRESSION PROTECTION INVARIANTS:
        // 1. If contact has already OPTED_OUT, a batch import MUST NOT revert them to OPTED_IN or PENDING.
        // 2. If contact is already OPTED_IN, a batch import with PENDING must not downgrade them.
        // 3. Existing suppression status is preserved; bulk import cannot unsuppress contacts.
        if (existing.consentStatus === ContactOptInStatus.OPTED_OUT) {
          updateDoc.consentStatus = ContactOptInStatus.OPTED_OUT;
        } else if (existing.consentStatus === ContactOptInStatus.OPTED_IN) {
          if (c.consentStatus === ContactOptInStatus.OPTED_OUT) {
            updateDoc.consentStatus = ContactOptInStatus.OPTED_OUT;
            if (c.consentSource) updateDoc.consentSource = c.consentSource;
          }
        } else if (c.consentStatus) {
          updateDoc.consentStatus = c.consentStatus;
          if (c.consentStatus === ContactOptInStatus.OPTED_IN && !existing.consentTimestamp) {
            updateDoc.consentTimestamp = new Date();
          }
          if (c.consentSource) updateDoc.consentSource = c.consentSource;
        }

        await ContactModel.updateOne({ _id: existing._id }, { $set: updateDoc });
        updatedCount++;
      } else {
        await ContactModel.create({
          workspaceId: workspaceObjectId,
          phoneNumber: c.phoneNumber.trim(),
          displayName: c.displayName?.trim(),
          email: c.email?.trim()?.toLowerCase() || null,
          tags: c.tags || [],
          customFields: c.customFields || {},
          source: c.source || 'csv_import',
          consentStatus: c.consentStatus || ContactOptInStatus.PENDING,
          consentSource: c.consentSource || 'csv_import',
          consentTimestamp:
            c.consentStatus === ContactOptInStatus.OPTED_IN ? c.consentTimestamp || new Date() : null,
          isSuppressed: false,
        });
        createdCount++;
      }
    }

    return { createdCount, updatedCount };
  }

  /**
   * Export all contacts matching filter criteria for the workspace.
   */
  static async exportContacts(
    workspaceId: string,
    filters: { tag?: string; consentStatus?: ContactOptInStatus; isSuppressed?: boolean } = {}
  ): Promise<IContact[]> {
    const query: FilterQuery<IContact> = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (filters.isSuppressed !== undefined) {
      query.isSuppressed = filters.isSuppressed;
    }
    if (filters.consentStatus) {
      query.consentStatus = filters.consentStatus;
    }
    if (filters.tag) {
      query.tags = filters.tag;
    }

    return ContactModel.find(query).sort({ createdAt: -1 });
  }
}
