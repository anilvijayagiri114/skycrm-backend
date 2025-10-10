// Update password after OTP verification
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Team from "../models/Team.js";
import { getTeams } from "./teamController.js";
import crypto from "crypto";
import { getIO } from "../serverSocket.js";
import { sendEmail } from "../MailTransporter.js";

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      roleId: user.role?._id?.toString?.() || user.role.toString(),
      roleName: user.role?.name || user.roleName,
    },
    process.env.JWT_SECRET || "change_me",
    { expiresIn: "12h" }
  );
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate("role");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const io = getIO();
    const token = signToken(user);

    // Update user's login status
    await User.findByIdAndUpdate(
      user._id,
      { lastLogin: new Date(), lastLogout: null },
      { new: true }
    );

    // Emit socket event for user status change
    io.emit("userStatusChange", {
      _id: user._id,
      lastLogin: new Date(),
      lastLogout: null,
    });

    req.logInfo = { message: "Login of user:" + user.email + " Successful" };
    // Send response
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        defaultPasswordChanged: user.defaultPasswordChanged,
      },
      message: "Login of user:" + user.email + " Successful",
    });
  } catch (error) {
    console.error('Login error:', error);
    req.logInfo = { error: "Login failed: Error occured is - " + error };
    return res
      .status(500)
      .json({ error: "Login failed: Error occured is - " + error });
  }
};

export const logout = async (req, res) => {
  req.shouldLog = true;
  const userId = req.user.userId;
  const io = getIO();
  try {
    await User.findByIdAndUpdate(
      userId,
      { lastLogout: new Date() },
      { new: true }
    );
    io.emit("userStatusChange", { _id: userId, lastLogout: new Date() });
    return res.json({
      message: "Logout of user:" + req.user.email + " successful",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Logout failed: Error occured is - " + err });
  }
};

export const register = async (req, res) => {
  req.shouldLog = true;
  const { name, email, roleName } = req.body;
  let { phone } = req.body;
  phone = phone?.trim();
  const role = await Role.findOne({ name: roleName });
  if (!role) return res.status(400).json({ error: "Invalid role" });
  const exists = await User.findOne({ email });
  if (exists)
    return res
      .status(400)
      .json({ error: "Email " + email + " already registered" });
  const tempPassword = generateRandomPassword() || process.env.DEFAULTPASSWORD;
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  try{
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone,
    role: role._id,
  });
  if (user) {
    try {
      await sendEmail(email, 'registration', { 
        name, 
        tempPassword 
      });
      
      return res.status(201).json({
          id: user._id,
          message: "User " + user.email + " created and email sent",
        });
    } catch (error) {
      console.error('Email sending failed:', error);
      return res.status(201).json({
          id: user._id,
          message: "User " + user.email + " created but email failed",
          error: error.message,
        });
    }
  }
}catch (err) {
    return res.status(500).json({
      error: "User " + email + " creation failed: Error occured is - " + err,
    });
  }
};

export const resetPassword = async (req, res) => {
  req.shouldLog = true;
  const { email, role, newPassword } = req.body;
  try {
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    await user.save();
    res
      .status(200)
      .json({ message: "Password of user " + email + " updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error in updating user " + email + " password",
      error: error.message,
    });
  }
};
export const changePassword = async (req, res) => {
  const userId = req.user?.userId;
  let { currentPassword, newPassword } = req.body;
  currentPassword = currentPassword.trim();
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok)
    return res.status(400).json({ error: "Current password is incorrect" });
  const isCurrentEqualsNewPassword = await bcrypt.compare(
    newPassword,
    user.passwordHash
  );
  if (isCurrentEqualsNewPassword) {
    return res.status(400).json({
      error: "New password cannot be same as current password",
    });
  }
  // Password validation
  // 8 characters, 2 uppercase, 1 special (!@#$&*), 2 numerals, 3 lowercase
  const passwordRegex =
    /^(?=(?:.*[A-Z]){2,})(?=(?:.*[a-z]){3,})(?=(?:.*\d){2,})(?=(?:.*[!@#$&*]){1,})[A-Za-z\d!@#$&*]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error:
        "Password must be at least 8 characters, contain 2 uppercase letters, 3 lowercase letters, 2 numbers, and 1 special character (!@#$&*) and no spaces",
    });
  }

  //   user.passwordHash = await bcrypt.hash(newPassword, 10);
  //   await user.save();
  //   res.json({ message: 'Password updated successfully' });
  // };
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  if (!user.defaultPasswordChanged) {
    user.defaultPasswordChanged = true;
  }
  try {
    await user.save();
    req.logInfo = {
      message: "Password updation of user " + user.email + " successful",
      target: userId,
    };
    res.json({ message: "Password updation successful" });
  } catch (err) {
    req.logInfo = {
      error:
        "Password change of user " +
        user.email +
        " unsuccessful: Error - " +
        err,
    };
    res.json({ error: "Password change unsuccessful: Error - " + err });
  }
};
// ...existing code...

// OTP email endpoint
export const sendRecoveryEmail = async (req, res) => {
  req.shouldLog = true;
  const { recipient_email, OTP } = req.body;
  if (!recipient_email || !OTP) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  try {
    // Find user to get their name
    const user = await User.findOne({ email: recipient_email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendEmail(recipient_email, 'forgotPassword', {
      name: user.name,
      resetToken: OTP,
      resetUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    });

    res.json({ message: "OTP sent to "+recipient_email+" for account recovery" });
  } catch (err) {
    
    console.error('Failed to send recovery email: ', err);
    res.status(500).json({
      error: `Failed to send recovery email to ${recipient_email}. Error occured: ${err.message}`,
    });
  }
};

// export const login = async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email }).populate('role');
//   if (!user) return res.status(401).json({ error: 'Invalid credentials' });
//   const ok = await bcrypt.compare(password, user.passwordHash);
//   if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
//   const token = signToken(user);
//   res.json({ token, user: { _id: user._id, name: user.name, email: user.email, roleName: user.role.name } });
// };

// export const register = async (req, res) => {
//   const { name, email, password, roleName } = req.body;
//   const role = await Role.findOne({ name: roleName });
//   if (!role) return res.status(400).json({ error: 'Invalid role' });
//   const exists = await User.findOne({ email });
//   if (exists) return res.status(400).json({ error: 'Email already registered' });
//   const passwordHash = await bcrypt.hash(password, 10);
//   const user = await User.create({ name, email, passwordHash, role: role._id });
//   res.status(201).json({ id: user._id });
// };

// export const listUsers = async (req, res) => {
//   const users = await User.find().populate('role','name');
//   res.json(users.map(u => ({
//     _id: u._id,
//     name: u.name,
//     email: u.email,
//     roleName: (u.role && typeof u.role === 'object' && u.role.name) ? u.role.name : (u.role || '')
//   })));
// };

const generateRandomPassword = (length = 8) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$&*";
  const passwordArray = Array.from(crypto.randomBytes(length));
  return passwordArray.map((b) => charset[b % charset.length]).join("");
};

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

    if (currentRoute === "/users") {
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

    const users = await User.find({ role: roleId }).populate("role", "name");
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

//     await checkRoleAndUpdateDetails(user, roleName, status);

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

// const checkRoleAndUpdateDetails = async (user, roleName, status) => {
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

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { name, email, status, phone },
      { new: true }
    ).populate("role", "name");

    if (!updatedUser) {
      req.logInfo = { error: "User not found", target: email };
      return res.status(404).json({ error: "User not found" });
    }

    const teams = await checkRoleAndUpdateDetails(user, roleName, status, req);

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

const checkRoleAndUpdateDetails = async (user, roleName, status, req) => {
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
    const adminUser = await User.findOne().populate({
      path: "role",
      match: { name: "Admin" },
    });

    if (!adminUser) {
      req.logInfo = {
        error:
          "No Admin user found to allocate teams under manager:" + user.email,
      };
      console.log("No Admin user found!");
      return;
    }
    for (const team of teams) {
      await Team.findByIdAndUpdate(
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
    await checkRoleAndUpdateDetails(user, user.roleName, user.status, req);
    const deletedUser = await User.findByIdAndDelete(user._id);
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
