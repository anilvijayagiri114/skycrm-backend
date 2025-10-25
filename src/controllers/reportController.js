import { generateManagerReport } from "../services/reportService.js";
import User from "../models/User.js";
import Team from "../models/Team.js";

export const generateReport = async (req, res) => {
  try {
    const managerId = req.user?.userId;
    const { type, start, end } = req.query;

    if (!managerId) {
      return res.status(400).json({ error: "Manager ID missing" });
    }

    const managerData = await User.findById(managerId).select("name email");

    const now = new Date();
    let fromDate = null;
    let toDate = now;

    switch (type) {
      case "today":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        fromDate = new Date();
        fromDate.setDate(now.getDate() - 7);
        break;
      case "15days":
        fromDate = new Date();
        fromDate.setDate(now.getDate() - 15);
        break;
      case "month":
        fromDate = new Date();
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case "3month":
        fromDate = new Date();
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case "custom":
        if (start && end) {
          fromDate = new Date(start);
          toDate = new Date(end);
        }
        break;
      default:
        // If no type passed, include all leads
        fromDate = null;
    }

    let dateFilter = {};
    if (fromDate) {
      dateFilter = { modifiedAt: { $gte: fromDate, $lte: toDate } };
    }

    console.log("from date:", fromDate, "to date:", toDate, "type:", type);


    const teams = await Team.find({ manager: managerId })
      .populate("manager", "name email")
      .populate("members", "name email")
      .populate({
        path: "leadsAssigned",
        select: "name phone email city source assignedTo status modifiedAt",
        match: dateFilter, // apply date filter here
        populate: [
          { path: "assignedTo", select: "name email" },
          { path: "status", select: "name" },
        ],
      });

    const pdfBuffer = await generateManagerReport(managerData, teams, fromDate, toDate);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Manager_Report_${
        type || "All"
      }.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
