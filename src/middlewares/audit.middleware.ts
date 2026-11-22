import { NextFunction, Request, Response } from 'express';
import { recordAudit } from '../utils/helper/audit';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Maps the first path segment after /api/v1 to a readable entity name. */
const ENTITY_NAMES: Record<string, string> = {
  actions: 'Action',
  appraisals: 'Appraisal',
  attendance: 'Attendance',
  candidates: 'Candidate',
  checklists: 'ChecklistTask',
  compensations: 'Compensation',
  departments: 'Department',
  documents: 'Document',
  employees: 'Employee',
  feedback: 'Feedback',
  goals: 'Goal',
  holidays: 'Holiday',
  interviews: 'Interview',
  'job-postings': 'JobPosting',
  'leave-balances': 'LeaveBalance',
  'leave-requests': 'LeaveRequest',
  notifications: 'Notification',
  'organization-settings': 'OrganizationSetting',
  'payroll-runs': 'PayrollRun',
  performance: 'PerformanceCycle',
  'performance-cycles': 'PerformanceCycle',
  reports: 'Report',
  roles: 'Role',
  teams: 'Team',
  users: 'User',
};

const entityFromPath = (path: string): string => {
  const segment = path.replace(/^\/api\/v1\/?/, '').split('/')[0] ?? '';
  return ENTITY_NAMES[segment] ?? segment;
};

/**
 * Records every successful mutation.
 *
 * This used to be an explicit call in four controllers, so changing a role or
 * deleting a document left no trace. Centralising it means new routes are
 * audited by default. Failures are swallowed inside `recordAudit` — an audit
 * write must not fail the operation it describes.
 */
export const auditMutations = (req: Request, res: Response, next: NextFunction) => {
  if (READ_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    if (!req.userId) return;

    const entity = entityFromPath(req.originalUrl || req.url);
    const idParam = (req.params as Record<string, string | undefined>)._id
      ?? (req.params as Record<string, string | undefined>).id;
    const method = req.method.toLowerCase();
    const action = `${entity.charAt(0).toLowerCase()}${entity.slice(1)}.${method}`;

    const detail = typeof req.body === 'object' && req.body !== null
      ? `${req.method} ${(req.originalUrl || req.url).split('?')[0]}`
      : `${req.method} ${(req.originalUrl || req.url).split('?')[0]}`;

    void recordAudit(req.userId, {
      action,
      entity,
      ...(idParam ? { entityId: idParam } : {}),
      detail,
    });
  });

  next();
};
