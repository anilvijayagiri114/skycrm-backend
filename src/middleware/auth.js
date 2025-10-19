import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';

export const authRequired = async (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    req.user = payload; // { userId, email, name, roleId, roleName }

    if (!req.user.roleName && req.user.userId) {
      try {
        const userDoc = await User.findById(req.user.userId).populate('role');
        if (userDoc) req.user.roleName = userDoc.role?.name || '';
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    }
    // ...existing code...
    // console.log("userLoggedIn=",req.user);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const permit = (...roleNames) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roleNames.includes(req.user.roleName)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
