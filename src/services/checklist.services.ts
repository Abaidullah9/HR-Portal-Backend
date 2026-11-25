import mongoose from 'mongoose';
import checklistTaskModel from '../models/checklistTask.model';
import checklistTemplateModel from '../models/checklistTemplate.model';
import employeeModel from '../models/employee.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { addDays, isDayKey, todayKey } from '../utils/dates';

const DEFAULT_TEMPLATES: { type: 'onboarding' | 'offboarding'; title: string; category: 'people' | 'it' | 'payroll' | 'compliance' | 'manager'; dueOffsetDays: number }[] = [
  { type: 'onboarding', title: 'Collect signed employment contract', category: 'compliance', dueOffsetDays: 0 },
  { type: 'onboarding', title: 'Upload ID and right-to-work documents', category: 'compliance', dueOffsetDays: 1 },
  { type: 'onboarding', title: 'Create work email and system accounts', category: 'it', dueOffsetDays: 0 },
  { type: 'onboarding', title: 'Assign a buddy and first-week schedule', category: 'manager', dueOffsetDays: 1 },
  { type: 'onboarding', title: 'Add to payroll and confirm bank details', category: 'payroll', dueOffsetDays: 2 },
  { type: 'offboarding', title: 'Schedule exit interview', category: 'people', dueOffsetDays: -2 },
  { type: 'offboarding', title: 'Revoke system access and collect equipment', category: 'it', dueOffsetDays: -1 },
  { type: 'offboarding', title: 'Process final pay and leave payout', category: 'payroll', dueOffsetDays: 0 },
  { type: 'offboarding', title: 'Archive employee documents', category: 'compliance', dueOffsetDays: 3 },
];

const ensureTemplates = async (type?: 'onboarding' | 'offboarding') => {
  const filter: Record<string, unknown> = tenantFilter({ active: true });
  if (type) filter.type = type;
  const existing = await checklistTemplateModel.find(filter);
  if (existing.length > 0) return existing;

  const seeds = DEFAULT_TEMPLATES.filter((template) => !type || template.type === type);
  const created = await checklistTemplateModel.insertMany(
    seeds.map((template) => ({ ...tenantFields(), ...template, active: true })),
  );
  return created;
};

/**
 * Materialises the checklist for one employee. Idempotent: an employee already
 * holding open tasks for the same type is not given duplicates.
 */
export const startChecklist = async (
  employeeId: string,
  type: 'onboarding' | 'offboarding',
  anchorDate?: string,
) => {
  const employee = await employeeModel.findOne(tenantFilter({ _id: employeeId }));
  if (!employee) throw new AppError('Employee not found', StatusCode.NOT_FOUND);

  const existing = await checklistTaskModel.countDocuments(tenantFilter({ employeeId, type }));
  if (existing > 0) return checklistTaskModel.find(tenantFilter({ employeeId, type }));

  const templates = await ensureTemplates(type);
  const anchor = isDayKey(anchorDate) ? anchorDate : todayKey();
  const managerId = employee.reportingManagerId;

  await checklistTaskModel.insertMany(
    templates.map((template) => ({
      ...tenantFields(),
      employeeId: employee._id,
      type,
      title: template.title,
      category: template.category,
      status: 'open',
      dueDate: addDays(anchor, template.dueOffsetDays),
      ...(managerId ? { ownerId: managerId } : {}),
    })),
  );

  return checklistTaskModel.find(tenantFilter({ employeeId, type })).sort({ dueDate: 1 });
};

export const listTasks = async (employeeId: string) =>
  checklistTaskModel.find(tenantFilter({ employeeId })).sort({ type: 1, dueDate: 1 });

export const listTemplates = async (type?: 'onboarding' | 'offboarding') => ensureTemplates(type);

export const createTemplate = async (input: {
  type: 'onboarding' | 'offboarding';
  title: string;
  category?: 'people' | 'it' | 'payroll' | 'compliance' | 'manager';
  dueOffsetDays?: number;
}) => {
  if (!input.title?.trim()) throw new AppError('A task title is required', StatusCode.BAD_REQUEST);
  return checklistTemplateModel.create({
    ...tenantFields(),
    type: input.type,
    title: input.title.trim(),
    category: input.category ?? 'people',
    dueOffsetDays: input.dueOffsetDays ?? 0,
    active: true,
  });
};

export const completeTask = async (
  taskId: string,
  status: 'open' | 'done' | 'skipped',
  actorId?: string,
  notes?: string,
) => {
  const task = await checklistTaskModel.findOne(tenantFilter({ _id: taskId }));
  if (!task) throw new AppError('Task not found', StatusCode.NOT_FOUND);

  task.status = status;
  if (status === 'done') {
    task.completedAt = new Date();
    if (actorId) task.completedBy = new mongoose.Types.ObjectId(actorId);
  } else {
    task.set('completedAt', undefined);
  }
  if (notes !== undefined) task.notes = notes;

  await task.save();
  return task;
};

export const addTask = async (
  employeeId: string,
  input: { title: string; type?: 'onboarding' | 'offboarding'; dueDate?: string; category?: 'people' | 'it' | 'payroll' | 'compliance' | 'manager' },
  actorId?: string,
) => {
  if (!input.title?.trim()) throw new AppError('A task title is required', StatusCode.BAD_REQUEST);
  return checklistTaskModel.create({
    ...tenantFields(),
    employeeId,
    type: input.type ?? 'onboarding',
    title: input.title.trim(),
    category: input.category ?? 'people',
    status: 'open',
    ...(input.dueDate && isDayKey(input.dueDate) ? { dueDate: input.dueDate } : {}),
    ...(actorId ? { ownerId: actorId } : {}),
  });
};

/** Reminders for open tasks due today, delivered through the notification feed. */
export const dueToday = async (day: string = todayKey()) =>
  checklistTaskModel
    .find(tenantFilter({ status: 'open', dueDate: day }))
    .populate('employeeId', 'name')
    .lean();

export default {
  startChecklist,
  listTasks,
  listTemplates,
  createTemplate,
  completeTask,
  addTask,
  dueToday,
};
