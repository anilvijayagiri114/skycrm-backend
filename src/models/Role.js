import mongoose from 'mongoose';
const RoleSchema = new mongoose.Schema({
  name: { type: String, enum: ['Admin','Sales Manager','Sales Team Lead','Sales Representatives'], unique: true, required: true }
}, { timestamps: true });
export default mongoose.model('Role', RoleSchema);
