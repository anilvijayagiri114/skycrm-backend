import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  level: { type: String, enum: ["info", "warn", "error"], default: "info" },
  statusCode: Number,
  message: String,
  user: String,  
  role:String,        
  target: String,      
  source: { type: String, default: "backend" },
  meta: Object,
  timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model("Log", logSchema);
export default Log;
