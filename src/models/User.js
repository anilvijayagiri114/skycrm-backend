import mongoose from "mongoose";
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    defaultPasswordChanged: { type: Boolean, default: false },
    phone: { type: String },
    lastLogin: { type: Date },
    lastLogout: { type: Date },
  },
  { timestamps: true }
);
export default mongoose.model("User", UserSchema);
