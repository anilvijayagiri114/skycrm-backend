import mongoose from 'mongoose';
const StatusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, enum: ['New','Contacted','Registered','Interested','Call Back','Follow-Up','Not Interested','Enrolled'] },
  order: { type: Number, required: true }
}, { timestamps: true });
export default mongoose.model('Status', StatusSchema);
