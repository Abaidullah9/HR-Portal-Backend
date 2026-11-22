import mongoose from 'mongoose';
import notificationModel, { NotificationKind } from '../models/notification.model';
import actionModel from '../models/action.model';
import roleModel from '../models/role.model';
import userModel from '../models/user.model';
import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import { MESSAGES } from '../utils/helper/constants/messages';

export interface NotificationPayload {
  title: string;
  detail: string;
  href: string;
  kind: NotificationKind;
}

/** Writes one notification per distinct recipient. Never throws into callers. */
const notifyUsers = async (
  userIds: (string | mongoose.Types.ObjectId)[],
  payload: NotificationPayload,
) => {
  const unique = [...new Set(userIds.map((id) => id.toString()))];
  if (unique.length === 0) return 0;

  const docs = await notificationModel.insertMany(
    unique.map((userId) => ({ ...payload, userId: new mongoose.Types.ObjectId(userId) })),
  );
  return docs.length;
};

/**
 * Notifies every active user whose role can perform `actionName`. This keeps
 * recipients in the permission model instead of a hard-coded role list, so a
 * custom role that gains the action also starts receiving the bell entries.
 */
const notifyUsersWithAction = async (actionName: string, payload: NotificationPayload) => {
  const action = await actionModel.findOne({ actionName }).select('_id');
  if (!action) return 0;

  const roles = await roleModel.find({ actions: action._id }).select('_id');
  if (roles.length === 0) return 0;

  const users = await userModel
    .find({ roleId: { $in: roles.map((role) => role._id) }, isActive: true })
    .select('_id');
  return notifyUsers(users.map((user) => user._id), payload);
};

/** Fire-and-forget wrapper so a notification failure never fails the write it describes. */
const notifySafely = (promise: Promise<unknown>) => {
  void promise.catch((error) => {
    console.error('[notifications] delivery failed:', error);
  });
};

const listForUser = async (userId: string, limit = 20) => {
  const [items, unread] = await Promise.all([
    notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit),
    notificationModel.countDocuments({ userId, readAt: { $exists: false } }),
  ]);
  return { items, unread };
};

const markRead = async (userId: string, id: string) => {
  if (!id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  const updated = await notificationModel.findOneAndUpdate(
    { _id: id, userId },
    { readAt: new Date() },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('Notification not found', StatusCode.NOT_FOUND);
  return updated;
};

const markAllRead = async (userId: string) => {
  await notificationModel.updateMany(
    { userId, readAt: { $exists: false } },
    { readAt: new Date() },
  );
};

export default {
  notifyUsers,
  notifyUsersWithAction,
  notifySafely,
  listForUser,
  markRead,
  markAllRead,
};
