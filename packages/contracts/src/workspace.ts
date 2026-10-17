import { z } from 'zod';

export const WorkspaceContextSchema = z.object({
  workspaceId: z.string().min(1),
  tenantId: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;
