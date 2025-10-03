import mongoose from 'mongoose';
const NoteSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  text: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now }
});
export default mongoose.model('Note', NoteSchema);
