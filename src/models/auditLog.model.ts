import mongoose, { Schema, Document } from 'mongoose';

export interface AuditChange {
  field: string;
  from?: unknown;
  to?: unknown;
}

export interface IAuditLog extends Document {
  organizationId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
  /** Field-level before/after, so the trail answers "what changed". */
  changes?: AuditChange[];
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    detail: { type: String, trim: true },
    changes: [
      {
        _id: false,
        field: { type: String, required: true },
        from: { type: Schema.Types.Mixed },
        to: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
