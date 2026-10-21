import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditEvent extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  actorUserId?: Types.ObjectId | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    targetType: String,
    targetId: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditEventSchema.index({ workspaceId: 1, createdAt: -1 });

export const AuditEventModel = model<IAuditEvent>('AuditEvent', AuditEventSchema);
