import auditLogModel, { type AuditChange } from '../../models/auditLog.model';
import userModel from '../../models/user.model';
import { contextOrganizationId } from '../context';

export type FieldChange = AuditChange;

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | undefined;
  detail?: string | undefined;
  changes?: FieldChange[] | undefined;
}

/** What `recordAudit` needs from a response in order to claim the entry. */
type AuditableResponse = { locals: Record<string, unknown> };

const comparable = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = comparable(source[key]);
        return result;
      }, {});
  }
  return value;
};

/**
 * Field-level before/after for the fields that actually differ.
 *
 * Undefined values are kept as "not set" rather than dropped, because
 * "clear the exit date" is as much a change as setting one.
 */
export const diffFields = (
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields?: string[],
): FieldChange[] => {
  if (!before || !after) return [];
  const keys = fields ?? [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return keys.reduce<FieldChange[]>((changes, field) => {
    const from = comparable(before[field]);
    const to = comparable(after[field]);
    if (JSON.stringify(from) === JSON.stringify(to)) return changes;
    changes.push({ field, from, to });
    return changes;
  }, []);
};

/**
 * Best-effort audit write: a failure here must never fail the operation it
 * describes, so the error is logged and swallowed.
 *
 * Passing the response marks the request as already audited so the central
 * `auditMutations` middleware does not add a second, vaguer entry for the same
 * action.
 */
export const recordAudit = async (
  actorId: string | undefined,
  entry: AuditEntry,
  res?: AuditableResponse,
) => {
  if (res) res.locals.auditRecorded = true;
  if (!actorId) return;
  try {
    const actor = await userModel.findById(actorId).select('name');
    const organizationId = contextOrganizationId();
    const log = new auditLogModel({
      ...(organizationId ? { organizationId } : {}),
      actorId,
      actorName: actor?.name ?? 'Unknown user',
      action: entry.action,
      entity: entry.entity,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.detail ? { detail: entry.detail } : {}),
      ...(entry.changes && entry.changes.length > 0 ? { changes: entry.changes } : {}),
    });
    await log.save();
  } catch (error) {
    console.error(`[AUDIT] failed to record ${entry.action}:`, (error as Error)?.message);
  }
};
