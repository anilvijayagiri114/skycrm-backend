// Update password after OTP verification
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
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

    const user = await User.findOne({ email }).populate("role");    //O(log n)
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
  const { name, email, roleName } = req.body;
  let { phone } = req.body;
  phone = phone?.trim();
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({error:"Name should contain only alphabets"})
  }

  if (!/^\d{1,10}$/.test(phone)) {
    return res.status(400).json({error:"Number must be 1-10 digits only"});
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|net|org|co)$/.test(email)) {
    return res.status(400).json({error:"Invalid email format"});
  }

  const role = await Role.findOne({ name: roleName }); //O(1)
  if (!role) return res.status(400).json({ error: "Invalid role" });
  const exists = await User.findOne({ email }); //O(log n)
  if (exists)
    return res
      .status(400)
      .json({ error: "Email " + email + " already registered" });
  const tempPassword = generateRandomPassword() || process.env.DEFAULTPASSWORD;
  const passwordHash = await bcrypt.hash(tempPassword, 10);
    try {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      await sendEmail(email, "registration", { name, tempPassword });
      break;
    }

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      role: role._id,
    });

    if (user) {
      req.logInfo = {
        message: "User " + user.email + " created and email sent",
      };
      return res.status(201).json({
        id: user._id,
        message: "User " + user.email + " created and email sent",
      });
    }
  } catch (err) {
    req.logInfo = {
      error: `User ${email} creation failed: Error occured is- ${err}`,
    };
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
  const user = await User.findById(userId);                    //O(Log n)
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
    const user = await User.findOne({ email: recipient_email });       //O(log n)
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

