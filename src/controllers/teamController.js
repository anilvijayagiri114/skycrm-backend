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
import Lead from "../models/Lead.js";
import { clearRedisCache as clearCache } from '../middleware/redisCache.js';
export const createTeam = async (req, res) => {
  req.shouldLog = true;
  const { name, leadId, memberIds } = req.body;
  // Populate members, lead, and manager for instant UI update
  try {
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
      clearCache('/api/team');
    res.status(201).json({
      populatedTeam,
      message: "Team: " + name + " created successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: "Team: " + name + " creation failed",
    });
  }
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
    if (role === "Sales Manager") {
      filter = { manager: req.user.userId };
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
  req.shouldLog = true;
  const { id } = req.params;
  const { memberIds } = req.body;
  const team = await Team.findByIdAndUpdate(
    id,
    { $addToSet: { members: { $each: memberIds || [] } } },
    { new: true }
  ).populate({ path: "members", select: "name email" });
  if (!team) {
    return res
      .status(404)
      .json({ error: "Team with id " + id + " not found to add team members" });
  }
  const membersList = team.members.map((m) => m.name).join(", ");
  clearCache('/api/team');
  res.json({
    team,
    message: `Team:${team.name} is added with ${memberIds.length} members. Team members are: ${membersList}`,
  });
};

export const setLead = async (req, res) => {
  req.shouldLog = true;
  const { id } = req.params;
  const { leadId, currentLeadId } = req.body;

  const team = await Team.findByIdAndUpdate(
    id,
    { lead: leadId },
    { new: true }
  ).populate({ path: "lead", select: "name email" });
  if (!team)
    return res
      .status(404)
      .json({ error: "Team with id " + id + " not found to set team lead" });

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

  clearCache('/api/team');
  res.json({
    team,
    message:
      "Team: " + team.name + " is set with a new team lead " + team.lead.name,
  });
};

export const deleteTeam = async (req, res) => {
  req.shouldLog = true;
  try {
    const { id } = req.params;
    // Step 1: Find team first (we need its leadsAssigned info)
    const team = await Team.findById(id);
    console.log("Deleting team:", team);
    if (!team) {
      return res.status(404).json({ error: "Team with id: " + id + " not found" });
    }
    
    // Step 2: Clear leads related to this team
    let leadsUpdated = false;
    if (team.leadsAssigned && team.leadsAssigned.length > 0) {
      await Lead.updateMany(
        { _id: { $in: team.leadsAssigned } },
        { $set: { teamId: null, assignedTo: null } }
      );
      leadsUpdated = true;
      console.log("Cleared leads assigned to this team.", team.leadsAssigned);
    } else {
      // If there are no leads to update, consider it successful by default
      leadsUpdated = true;
    }

    // Step 3: If the team has a lead (Team Lead), reset their role
    let leadRoleUpdated = false;
    if (team.lead) {
      const exTeamLeadId = team.lead._id || team.lead;
      const salesRepRole = await Role.findOne({ name: "Sales Representatives" });

      if (salesRepRole) {
        await User.findByIdAndUpdate(exTeamLeadId, { role: salesRepRole._id });
        leadRoleUpdated = true;
      } else {
        // Role not found, treat as failure
        leadRoleUpdated = false;
      }
    } else {
      // No lead to update, consider successful by default
      leadRoleUpdated = true;
    }

    // Step 4: Delete the team only if both updates succeeded
    if (leadsUpdated && leadRoleUpdated) {
      console.log("deleting tea,,,,,,,,,,,,,");
      clearCache('/api/team');
      const deletedTeam = await Team.findByIdAndDelete(id);
      return res.json({
        message: `Team: ${team.name} deleted successfully`,
        deletedTeam,
      });
    } else {
      return res.status(500).json({ error: "Failed to update leads or lead role, team not deleted" });
    }
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const editTeam = async (req, res) => {
  req.shouldLog = true;
  try {
    const teamId = req.params.id;
    const { name, memberIds } = req.body;
    const currentTeam = await Team.findById(teamId).populate({
      path: "members",
      populate: { path: "role" },
    });
    if (!currentTeam) {
      return res
        .status(404)
        .json({ error: "Team with id " + teamId + " not found" });
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
    ).populate({ path: "members", select: "name email" });
    const membersList = updatedTeam.members.map((m) => m.name).join(", ");
    clearCache('/api/team');
    res.status(200).json({
      message: `Team: ${currentTeam.name} updated successfully. Updated team details: Team name: ${updatedTeam.name}, Team members: ${membersList}`,
      updatedTeam,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Server error. Error: " + error, details: error.message });
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
        message:
          "Forbidden: Only Admin or Sales Team Lead can access this resource.",
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
