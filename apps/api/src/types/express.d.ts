import { WorkspaceRole } from '@whatsapp-saas/contracts';
import { IWorkspace } from '@whatsapp-saas/database';

export interface AuthContextUser {
  id: string;
  email: string;
  displayName: string;
  accountStatus: string;
  emailVerified: boolean;
}

export interface WorkspaceMembershipContext {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContextUser;
      workspace?: IWorkspace;
      membership?: WorkspaceMembershipContext;
      rawBody?: Buffer;
    }
  }
}
