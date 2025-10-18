import User from "../models/User.js";
import Role from "../models/Role.js";
import Team from "../models/Team.js";
import { getTeams } from "./teamController.js";

// export const listUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate("role", "name");
//     res.json(
//       users.map((u) => ({
//         _id: u._id,
//         name: u.name,
//         email: u.email,
//         roleName: u.role?.name,
//         phone: u.phone,
//         status: u.status,
//         lastLogin: u.lastLogin,
//         lastLogout: u.lastLogout,
//       }))
//     );
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ error: "Failed to fetch users" });
//   }
// };
export const listUsers = async (req, res) => {
  try {
    const currentRoute = req.route.path;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (currentRoute === "/") {
      const users = await User.find().populate("role", "name");
      res.json(
        users.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          roleName: u.role?.name,
          phone: u.phone,
          status: u.status,
          lastLogin: u.lastLogin,
          lastLogout: u.lastLogout,
        }))
      );
    } else {
      const users = await User.find()
        .populate("role", "name")
        .skip(skip)
        .limit(limit);
      const totalUsers = await User.countDocuments();
      const formattedUsers = users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        roleName: u.role?.name,
        phone: u.phone,
        status: u.status,
        lastLogin: u.lastLogin,
        lastLogout: u.lastLogout,
      }));
      res.json({
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        users: formattedUsers,
      });
    }
  } catch (err) {
    console.error("Error fetching paginated users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsersByRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json({ error: "roleId is required" });
    }

    const users = await User.find({ role: roleId }).populate("role", "name");      //O(log n)
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "Users with given role not found" });
    }

    res.json(
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        roleName: u.role?.name,
        phone: u.phone,
        status: u.status,
        lastLogin: u.lastLogin,
        lastLogout: u.lastLogout,
      }))
    );
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({ error: "Failed to fetch users by role" });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user._id || !user.roleName) {
      return res.status(400).json({ error: "Invalid user data" });
    }

    let teamFilter = {};
    if (user.roleName === "Sales Manager") {
      teamFilter = { manager: user._id };
    } else if (user.roleName === "Sales Team Lead") {
      teamFilter = { lead: user._id };
    } else if (user.roleName === "Sales Representatives") {
      teamFilter = { members: user._id };
    }

    const teams = await getTeams(teamFilter);

    const userDetails = {
      _id: user._id,
      name: user.name,
      email: user.email,
      roleName: user.roleName,
      status: user.status,
      phone: user.phone,
      teams: teams || [],
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout,
    };

    res.json({ user: userDetails });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
};

// export const updateUserDetails = async (req, res) => {
//   try {
//     const { user } = req.body;
//     if (!user || !user._id) {
//       return res.status(400).json({ error: "User ID is required" });
//     }

//     let { name, email, status, roleName } = user;
//     name = name?.trim();
//     email = email?.trim().toLowerCase();
//     status = status?.trim();
//     phone = phone?.trim();

//     const updatedUser = await User.findByIdAndUpdate(
//       user._id,
//       { name, email, status, phone},
//       { new: true }
//     ).populate("role", "name");

//     if (!updatedUser) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     await checkUserRoleAndUpdateDetails(user, roleName, status);

//     res.json({
//       _id: updatedUser._id,
//       name: updatedUser.name,
//       email: updatedUser.email,
//       status: updatedUser.status,
//       roleName: updatedUser.role?.name || "",
//       phone: updatedUser.phone,
//       teams: teams || [],
//       lastLogin: updatedUser.lastLogin,
//       lastLogout: updatedUser.lastLogout,
//     });
//   } catch (error) {
//     console.error("Error updating user details:", error);
//     res.status(500).json({ error: "Failed to update user details" });
//   }
// };

// const checkUserRoleAndUpdateDetails = async (user, roleName, status) => {
//   let teamFilter = {};
//   if (roleName === "Sales Manager") {
//     teamFilter = { manager: user._id };
//   } else if (roleName === "Sales Team Lead") {
//     teamFilter = { lead: user._id };
//   } else if (roleName === "Sales Representatives") {
//     teamFilter = { members: user._id };
//   }
//   const teams = await getTeams(teamFilter);

//   if (roleName === "Sales Manager" && status === "inactive") {
//     const adminUser = await User.findOne().populate({
//       path: "role",
//       match: { name: "Admin" },
//     });

//     if (!adminUser) {
//       console.log("No Admin user found!");
//       return;
//     }
//     for (const team of teams) {
//       await Team.findByIdAndUpdate(
//         team._id,
//         { manager: adminUser._id },
//         { new: true }
//       );
//     }
//     console.log("Teams updated with Admin as manager");
//   }

//   if (roleName === "Sales Team Lead" && status === "inactive") {
//     console.log("In team lead");
//     for (const team of teams) {
//       await Team.findByIdAndUpdate(
//         team._id,
//         { lead: null, $pull: { members: user?._id } },
//         { new: true }
//       );
//     }
//   }

//   if (roleName === "Sales Representatives" && status === "inactive") {
//     for (const team of teams) {
//       await Team.findByIdAndUpdate(
//         team._id,
//         { $pull: { members: user?._id } },
//         { new: true }
//       );
//     }
//   }
// };

export const updateUserDetails = async (req, res) => {
  const { user } = req.body;
  try {
    if (!user || !user._id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let { name, email, status, roleName, phone } = user;
    name = name?.trim();
    email = email?.trim().toLowerCase();
    status = status?.trim();
    phone = phone?.trim();

    const updatedUser = await User.findByIdAndUpdate(               //O(log n)
      user._id,
      { name, email, status, phone },
      { new: true }
    ).populate("role", "name");

    if (!updatedUser) {
      req.logInfo = { error: "User not found", target: email };
      return res.status(404).json({ error: "User not found" });
    }

    const teams = await checkUserRoleAndUpdateDetails(user, roleName, status, req);

    req.logInfo = {
      message: `User updated. Details : ${updatedUser.name}, ${updatedUser.email}, ${updatedUser.status}, ${updatedUser?.phone}`,
      target: email,
    };

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
      roleName: updatedUser.role?.name || "",
      phone: updatedUser.phone,
      teams: teams || [],
      lastLogin: updatedUser.lastLogin,
      lastLogout: updatedUser.lastLogout,
    });
  } catch (err) {
    console.error("Error updating user details:", err);
    req.logInfo = {
      error: "Failed to update user details: Error - " + err,
      target: email,
    };
    res.status(500).json({ error: "Failed to update user details" });
  }
};

const checkUserRoleAndUpdateDetails = async (user, roleName, status, req) => {
  let teamFilter = {};
  if (roleName === "Sales Manager") {
    teamFilter = { manager: user._id };
  } else if (roleName === "Sales Team Lead") {
    teamFilter = { lead: user._id };
  } else if (roleName === "Sales Representatives") {
    teamFilter = { members: user._id };
  }
  const teams = await getTeams(teamFilter);
  if (roleName === "Sales Manager" && status === "inactive") {
    const roleId = await Role.findOne({name:"Admin"});          //O(1)
    const adminUser = await User.findOne({role: roleId}).populate('role');     //O(log n)

    if (!adminUser) {
      req.logInfo = {
        error:
          "No Admin user found to allocate teams under manager:" + user.email,
      };
      console.log("No Admin user found!");
      return;
    }
    for (const team of teams) {
      await Team.findByIdAndUpdate(       // O(log n)
        team._id,
        { manager: adminUser._id },
        { new: true }
      );
    }
    req.logInfo = {
      message:
        "Teams under manager: " +
        user.email +
        " are now allocated to Admin: " +
        adminUser.email,
    };
    console.log("Teams updated with Admin as manager");
  }

  if (roleName === "Sales Team Lead" && status === "inactive") {
    try {
      for (const team of teams) {
        await Team.findByIdAndUpdate(
          team._id,
          { lead: null, $pull: { members: user?._id } },
          { new: true }
        );
      }
      req.logInfo = {
        message: "User " + user.email + " successfully removed from team",
      };
    } catch (err) {
      req.logInfo = {
        error: "User: "+user.email + " removal from team is unsuccessful. Error: "+err,
        target: user.email,
      };
      console.log("User removal from team is unsuccessful");
    }
  }

  if (roleName === "Sales Representatives" && status === "inactive") {
    try {
      for (const team of teams) {
        await Team.findByIdAndUpdate(                
          team._id,
          { $pull: { members: user?._id } },
          { new: true }
        );
      }
      req.logInfo = {
        message: "User " + user.email + " successfully removed from team",
      };
    } catch (err) {
      req.logInfo = {
        error: "User: "+user.email + " removal from team is unsuccessful. Error: "+err,
        target: user.email,
      };
    }
  }

  return teams;
};

export const deleteUser = async (req, res) => {
  const { user } = req.body;
  try {
    if (!user || !user._id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    await checkUserRoleAndUpdateDetails(user, user.roleName, user.status, req);
    const deletedUser = await User.findByIdAndDelete(user._id);   //O(log n)
    if (!deletedUser) {
      req.logInfo = {
        error: "User deletion unsuccessful: User not found",
        target: user.email,
      };
      return res.status(404).json({ error: "User not found" });
    }
    req.logInfo = { message: "User " + user.email + " deleted successfully" };
    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    req.logInfo = {
      error:
        "Error in deleting user " + user.email + ". Error occured is: " + error,
    };
    return res.status(500).json({ error: "Internal server error" });
  }
};
