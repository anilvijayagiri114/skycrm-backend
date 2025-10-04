import Log from "../models/Log.js";
export const listLogs = async (req, res) => {
  console.log("list logs");
  try {
    const logsList = await Log.find().sort({ timestamp: -1 });
    res.status(200).json(logsList);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};
