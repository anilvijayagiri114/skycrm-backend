// Update password after OTP verification
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import crypto from "crypto";
import { getIO } from "../serverSocket.js";
import { sendEmail } from "../MailTransporter.js";
import Team from "../models/Team.js";
import { getTeams } from "./teamController.js";
import { getRedisClient } from "../config/redis.js";

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
    const { email, password,selectedRole} = req.body;
    console.log("selecteedrole==============",selectedRole);
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate("role");    //O(log n)
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (selectedRole && user.role.name !== selectedRole) {
      return res.status(401).json({ error: "Invalid role for this user" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
   
    const token = signToken(user);
    // ✅ Redis session
  const redisClient = getRedisClient();
  const sessionKey = `crm_sess:${user._id}`;
  await redisClient.setEx(
    sessionKey,
    12 * 60 * 60, // 12 hours same as JWT expiry
    JSON.stringify({ token, roleName: user.role.name, email: user.email })
  );

    const io = getIO();

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
  try {
  req.shouldLog = true;
  const userId = req.user.userId;
  const email = req.user.email;
  const redisClient = getRedisClient();
  const sessionKey = `crm_sess:${userId}`;
  await redisClient.del(sessionKey);
  if (email) {
    await redisClient.del(`rl:login:${email}`);
  } else {
    const ipKey = `rl:login:${req.ip}`;
    await redisClient.del(ipKey);
  }
  const io = getIO();

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

// Logout via beacon (may be sent without standard Authorization header)
export const logoutBeacon = async (req, res) => {
  try {
    // beacon may send token in body
    const token = req.body?.token;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    // verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userId = payload.userId;
    const email = payload.email;
    const redisClient = getRedisClient();
    const sessionKey = `crm_sess:${userId}`;
    // Instead of immediately deleting the session (which would prevent a quick reload
    // from reusing the token), set a short TTL so a fast reload/heartbeat can restore the session.
    const GRACE_SECONDS = 12; // short grace window (seconds)
    await redisClient.expire(sessionKey, GRACE_SECONDS);
    if (email) {
      await redisClient.expire(`rl:login:${email}`, GRACE_SECONDS);
    } else {
      const ipKey = `rl:login:${req.ip}`;
      await redisClient.expire(ipKey, GRACE_SECONDS);
    }
    const io = getIO();
    await User.findByIdAndUpdate(userId, { lastLogout: new Date() }, { new: true });
    io.emit('userStatusChange', { _id: userId, lastLogout: new Date() });
    // send minimal response
    return res.json({ message: 'Beacon logout processed' });
  } catch (err) {
    console.error('Beacon logout failed', err);
    return res.status(500).json({ error: 'Beacon logout failed' });
  }
};

// Heartbeat endpoint to refresh session TTL (prevents logout during short tab switches/refreshes)
export const heartbeat = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const redisClient = getRedisClient();
    const sessionKey = `crm_sess:${userId}`;
    const sessionData = await redisClient.get(sessionKey);
    if (!sessionData) return res.status(401).json({ error: 'Session not found' });
    // Refresh TTL to match JWT expiry (12 hours)
    await redisClient.expire(sessionKey, 12 * 60 * 60);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Heartbeat failed', err);
    return res.status(500).json({ error: 'Heartbeat failed' });
  }
};

// Validate session endpoint to check if Redis session is still valid
export const validateSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const redisClient = getRedisClient();
    const sessionKey = `crm_sess:${userId}`;
    const sessionData = await redisClient.get(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    
    return res.json({ valid: true });
  } catch (err) {
    console.error('Session validation failed:', err);
    return res.status(500).json({ error: 'Session validation failed' });
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
    user.defaultPasswordChanged = true;
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

export const listUsers = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};





export const refreshSession = async (req, res) => {
  const userId = req.user.userId;
  const newToken = signToken({ userId });
  const redisClient = getRedisClient();

  const sessionKey = `crm_sess:${userId}`;
  await redisClient.setEx(
    sessionKey,
    12 * 60 * 60,
    JSON.stringify({ token: newToken })
  );

  res.json({ token: newToken });
};
