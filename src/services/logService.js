import Log from "../models/Log.js";
import { getIO } from "../serverSocket.js";

export const createLog = async (data) => {
  try {
    const log = await Log.create(data);
    const io = getIO();
    if (io) {
      io.emit("newLog", log);
    }
  } catch (err) {
    console.error("Failed to create log", err);
  }
};
