import { connectDatabase, disconnectDatabase } from '@whatsapp-saas/database';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceInvitationModel,
  SessionModel,
  EmailVerificationTokenModel,
  PasswordResetTokenModel,
  WhatsAppAccountModel,
  WebhookEventModel,
  ContactModel,
} from '@whatsapp-saas/database';

const TEST_MONGO_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas_test';

export async function setupTestDatabase(): Promise<void> {
  await connectDatabase({
    uri: TEST_MONGO_URI,
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });
  await clearTestDatabase();
}

export async function clearTestDatabase(): Promise<void> {
  await Promise.all([
    UserModel.deleteMany({}),
    WorkspaceModel.deleteMany({}),
    WorkspaceMemberModel.deleteMany({}),
    WorkspaceInvitationModel.deleteMany({}),
    SessionModel.deleteMany({}),
    EmailVerificationTokenModel.deleteMany({}),
    PasswordResetTokenModel.deleteMany({}),
    WhatsAppAccountModel.deleteMany({}),
    WebhookEventModel.deleteMany({}),
    ContactModel.deleteMany({}),
  ]);
}

export async function teardownTestDatabase(): Promise<void> {
  await clearTestDatabase();
  await disconnectDatabase();
}
