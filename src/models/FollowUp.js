import mongoose from 'mongoose';
const FollowUpSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueAt: { type: Date, required: true },
  done: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });
export default mongoose.model('FollowUp', FollowUpSchema);
