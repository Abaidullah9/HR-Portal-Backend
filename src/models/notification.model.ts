import mongoose, { Schema, Document } from 'mongoose';

export type NotificationKind =
  | 'leave'
  | 'payroll'
  | 'attendance'
  | 'appraisal'
  | 'employee'
  | 'recruitment'
  | 'compliance'
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  detail: string;
  href: string;
  kind: NotificationKind;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  detail: { type: String, required: true, trim: true },
  href: { type: String, required: true, trim: true },
  kind: {
    type: String,
    enum: ['leave', 'payroll', 'attendance', 'appraisal', 'employee', 'recruitment', 'compliance', 'system'],
    default: 'system',
    index: true,
  },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
