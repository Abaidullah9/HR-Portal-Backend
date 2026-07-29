import mongoose, { Schema, Document } from 'mongoose';


export interface ITeam extends Document {
  teamName: string;
  teamLeadId?: mongoose.Types.ObjectId;
  teamMembers: { employeeId: mongoose.Types.ObjectId }[];
}
const teamSchema = new Schema<ITeam>({
  teamName: { type: String, required: true, unique: true, trim: true },
  teamLeadId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  teamMembers: [{
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }
  }]
}, { timestamps: true });
teamSchema.index({ 'teamMembers.employeeId': 1 });
export default mongoose.model<ITeam>('Team', teamSchema);
