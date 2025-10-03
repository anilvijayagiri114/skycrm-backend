import mongoose from 'mongoose';
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sales Head
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Team Lead
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  leadsAssigned: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Team', TeamSchema);
