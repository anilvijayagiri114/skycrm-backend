// import Team from "../models/Team.js";
// import User from "../models/User.js";
// import Role from "../models/Role.js";

// export const createTeam = async (req, res) => {
//   const { name, leadId, memberIds } = req.body;
//   const team = await Team.create({
//     name,
//     manager: req.user.userId,
//     lead: leadId || undefined,
//     members: memberIds || [],
//   });
//   // Populate members, lead, and manager for instant UI update
//   const populatedTeam = await Team.findById(team._id)
//     .populate("lead", "name email")
//     .populate("manager", "name email")
//     .populate("members", "name email");
//   res.status(201).json(populatedTeam);
// };

// export const getTeams = async (filter) => {
//   return Team.find(filter)
//     .populate("lead", "name email")
//     .populate("manager", "name email")
//     .populate("members", "name email");
// };

// // export const listTeams = async (req, res) => {
// //   const role = req.user.roleName;
// //   let filter = {};
// //   if (role === "Sales Team Lead") filter = { lead: req.user.userId };
// //   if (role === "Sales Representatives") filter = { members: req.user.userId };
// //   const teams = await Team.find(filter)
// //     .populate("lead", "name email")
// //     .populate("manager", "name email")
// //     .populate("members", "name email");
// //   res.json(teams);
// // };

// export const listTeams = async (req, res) => {
//   try {
//     const role = req.user.roleName;
//     let filter = {};

//     if (role === "Sales Team Lead") filter = { lead: req.user.userId };
//     if (role === "Sales Representatives") filter = { members: req.user.userId };

//     const teams = await getTeams(filter);
//     res.json(teams);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch teams" });
//   }
// };

// export const addMembers = async (req, res) => {
//   const { id } = req.params;
//   const { memberIds } = req.body;
//   const team = await Team.findByIdAndUpdate(
//     id,
//     { $addToSet: { members: { $each: memberIds || [] } } },
//     { new: true }
//   );
//   if (!team) return res.status(404).json({ error: "Team not found" });
//   res.json(team);
// };

// export const setLead = async (req, res) => {
//   const { id } = req.params;
//   const { leadId, currentLeadId } = req.body;

//   const team = await Team.findByIdAndUpdate(
//     id,
//     { lead: leadId },
//     { new: true }
//   );
//   if (!team) return res.status(404).json({ error: "Team not found" });

//   const roleLead = await Role.findOne({ name: "Sales Team Lead" });
//   if (!roleLead) return res.status(404).json({ error: "Role not found" });

//   if (currentLeadId) {
//     const roleRep = await Role.findOne({ name: "Sales Representatives" });
//     if (roleRep) {
//       await User.findByIdAndUpdate(
//         currentLeadId,
//         { role: roleRep._id },
//         { new: true }
//       );
//     }
//   }

//   const user = await User.findByIdAndUpdate(
//     leadId,
//     { role: roleLead._id },
//     { new: true }
//   );
//   if (!user) return res.status(404).json({ error: "User not found" });

//   res.json(team);
// };

// export const deleteTeam = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedTeam = await Team.findByIdAndDelete(id);

//     if (!deletedTeam) {
//       return res.status(404).json({ error: "Team not found" });
//     }

//     if (deletedTeam.lead) {
//       const exTeamLeadId = deletedTeam.lead._id || deletedTeam.lead;
//       const salesRepRole = await Role.findOne({
//         name: "Sales Representatives",
//       });

//       if (salesRepRole) {
//         await User.findByIdAndUpdate(exTeamLeadId, { role: salesRepRole._id });
//       }
//     }

//     res.json({ message: "Team deleted successfully", deletedTeam });
//   } catch (error) {
//     res.status(500).json({ error: "Server error", details: error.message });
//   }
// };

// export const editTeam = async (req, res) => {
//   try {
//     const teamId = req.params.id;
//     const { name, memberIds } = req.body;

//     const currentTeam = await Team.findById(teamId).populate({
//       path: "members",
//       populate: { path: "role" },
//     });

//     if (!currentTeam) {
//       return res.status(404).json({ error: "Team not found" });
//     }

//     const teamLead = currentTeam.members.find(
//       (member) => member.role?.name === "Sales Team Lead"
//     );

//     if (teamLead) {
//       const salesRepRole = await Role.findOne({
//         name: "Sales Representatives",
//       });
//       await User.findByIdAndUpdate(teamLead._id, { role: salesRepRole._id });
//     }

//     const updatedTeam = await Team.findByIdAndUpdate(
//       teamId,
//       { $set: { name, members: memberIds }, $unset: { lead: "" } },
//       { new: true }
//     );

//     res.status(200).json({
//       message: "Team updated successfully",
//       updatedTeam,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error", details: error.message });
//   }
// };

import Team from "../models/Team.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

export const createTeam = async (req, res) => {
  const { name, leadId, memberIds } = req.body;
  const team = await Team.create({
    name,
    manager: req.user.userId,
    lead: leadId || undefined,
    members: memberIds || [],
  });
  // Populate members, lead, and manager for instant UI update
  const populatedTeam = await Team.findById(team._id)
    .populate("lead", "name email")
    .populate("manager", "name email")
    .populate("members", "name email");
  res.status(201).json(populatedTeam);
};

// export const getTeams = async (filter) => {
//   try {
//     console.log('getTeams called with filter:', filter);
//     const query = Team.find(filter);
//     console.log('Executing query with populates...');
//     const teams = await query
//       .populate("lead", "name email")
//       .populate("manager", "name email")
//       .populate("members", "name email");
//     console.log(`Found ${teams.length} teams`);
//     return teams;
//   } catch (error) {
//     console.error("Error in getTeams:", error);
//     console.error("Stack trace:", error.stack);
//     throw new Error(`Failed to fetch teams data: ${error.message}`);
//   }
// };

export const getTeams = async (filter) => {
  return Team.find(filter)
    .populate("lead", "name email")
    .populate("manager", "name email")
    .populate("members", "name email");
};

// export const listTeams = async (req, res) => {
//   const role = req.user.roleName;
//   let filter = {};
//   if (role === "Sales Team Lead") filter = { lead: req.user.userId };
//   if (role === "Sales Representatives") filter = { members: req.user.userId };
//   const teams = await Team.find(filter)
//     .populate("lead", "name email")
//     .populate("manager", "name email")
//     .populate("members", "name email");
//   res.json(teams);
// };

export const listTeams = async (req, res) => {
  try {
    console.log('listTeams called - Request user:', { 
      userId: req.user?.userId,
      roleName: req.user?.roleName
    });

    // Check if user data is available
    if (!req.user || !req.user.roleName) {
      console.error('Missing user data in request');
      return res.status(400).json({ message: "User role information is missing" });
    }

    const role = req.user.roleName;
    let filter = {};

    if (role === "Sales Team Lead") {
      filter = { lead: req.user.userId };
      console.log('Filtering for Team Lead:', req.user.userId);
    }
    if (role === "Sales Representatives") {
      filter = { members: req.user.userId };
      console.log('Filtering for Sales Rep:', req.user.userId);
    }
    console.log('Applying filter:', filter);

    const teams = await getTeams(filter);
    
    if (!teams) {
      console.log('No teams found for filter');
      return res.status(404).json({ message: "No teams found" });
    }

    console.log(`Successfully found ${teams.length} teams`);
    res.json(teams);
  } catch (err) {
    console.error("Error in listTeams:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ 
      message: "Failed to fetch teams", 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const addMembers = async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;
  const team = await Team.findByIdAndUpdate(
    id,
    { $addToSet: { members: { $each: memberIds || [] } } },
    { new: true }
  );
  if (!team) return res.status(404).json({ error: "Team not found" });
  res.json(team);
};

export const setLead = async (req, res) => {
  const { id } = req.params;
  const { leadId, currentLeadId } = req.body;

  const team = await Team.findByIdAndUpdate(
    id,
    { lead: leadId },
    { new: true }
  );
  if (!team) return res.status(404).json({ error: "Team not found" });

  const roleLead = await Role.findOne({ name: "Sales Team Lead" });
  if (!roleLead) return res.status(404).json({ error: "Role not found" });

  if (currentLeadId) {
    const roleRep = await Role.findOne({ name: "Sales Representatives" });
    if (roleRep) {
      await User.findByIdAndUpdate(
        currentLeadId,
        { role: roleRep._id },
        { new: true }
      );
    }
  }

  const user = await User.findByIdAndUpdate(
    leadId,
    { role: roleLead._id },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(team);
};

export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTeam = await Team.findByIdAndDelete(id);

    if (!deletedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    if (deletedTeam.lead) {
      const exTeamLeadId = deletedTeam.lead._id || deletedTeam.lead;
      const salesRepRole = await Role.findOne({
        name: "Sales Representatives",
      });

      if (salesRepRole) {
        await User.findByIdAndUpdate(exTeamLeadId, { role: salesRepRole._id });
      }
    }

    res.json({ message: "Team deleted successfully", deletedTeam });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const editTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const { name, memberIds } = req.body;

    const currentTeam = await Team.findById(teamId).populate({
      path: "members",
      populate: { path: "role" },
    });

    if (!currentTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    const teamLead = currentTeam.members.find(
      (member) => member.role?.name === "Sales Team Lead"
    );

    if (teamLead) {
      const salesRepRole = await Role.findOne({
        name: "Sales Representatives",
      });
      await User.findByIdAndUpdate(teamLead._id, { role: salesRepRole._id });
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { $set: { name, members: memberIds }, $unset: { lead: "" } },
      { new: true }
    );

    res.status(200).json({
      message: "Team updated successfully",
      updatedTeam,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getTeamDetailsForLead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.roleName;
    let teamQuery = {};

    // If admin is viewing, use the teamId from query params
    if (role === "Admin") {
      const { teamId } = req.query;
      if (teamId) {
        teamQuery = { _id: teamId };
      } else {
        // Return first team if no specific team is requested
        const team = await Team.findOne({})
          .populate("lead", "name email")
          .populate("manager", "name email")
          .populate("members", "name email")
          .populate("leadsAssigned");
        return res.json(team);
      }
    } else if (role === "Sales Team Lead") {
      // For team lead, find their own team
      teamQuery = { lead: userId };
    } else {
      return res.status(403).json({
        message: "Forbidden: Only Admin or Sales Team Lead can access this resource.",
      });
    }

    const team = await Team.findOne(teamQuery)
      .populate("lead", "name email")
      .populate("manager", "name email")
      .populate("members", "name email")
      .populate("leadsAssigned");

    if (!team) {
      return res.status(404).json({ message: "No team found." });
    }

    res.json(team);
  } catch (err) {
    console.error("Error fetching team details:", err);
    res.status(500).json({ message: "Failed to fetch team details" });
  }
};