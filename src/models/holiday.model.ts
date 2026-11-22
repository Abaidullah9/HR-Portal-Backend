import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  organizationId?: mongoose.Types.ObjectId;
  name: string;
  /** Calendar day in the organisation timezone, stored as YYYY-MM-DD. */
  date: string;
  /** Paid holidays still count as a working day for leave purposes. */
  paid: boolean;
}

const holidaySchema = new Schema<IHoliday>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  name: { type: String, required: true, trim: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  paid: { type: Boolean, default: true },
}, { timestamps: true });

holidaySchema.index({ organizationId: 1, date: 1 }, { unique: true, sparse: true });

export default mongoose.model<IHoliday>('Holiday', holidaySchema);
