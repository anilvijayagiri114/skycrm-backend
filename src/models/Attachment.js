import mongoose from 'mongoose';
const AttachmentSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
});
export default mongoose.model('Attachment', AttachmentSchema);
