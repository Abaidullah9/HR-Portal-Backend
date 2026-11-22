import auditLogModel from '../../models/auditLog.model';
import userModel from '../../models/user.model';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | undefined;
  detail?: string | undefined;
}

/**
 * Best-effort audit write: a failure here must never fail the operation it
 * describes, so the error is logged and swallowed.
 */
export const recordAudit = async (actorId: string | undefined, entry: AuditEntry) => {
  if (!actorId) return;
  try {
    const actor = await userModel.findById(actorId).select('name');
    const log = new auditLogModel({
      actorId,
      actorName: actor?.name ?? 'Unknown user',
      action: entry.action,
      entity: entry.entity,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.detail ? { detail: entry.detail } : {}),
    });
    await log.save();
  } catch (error) {
    console.error(`[AUDIT] failed to record ${entry.action}:`, (error as Error)?.message);
  }
};
