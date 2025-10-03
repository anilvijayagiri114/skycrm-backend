import bcrypt from 'bcrypt';
import Role from '../models/Role.js';
import User from '../models/User.js';

export const ensureDefaultAdmin = async () => {
  try {
    // Ensure roles exist
    const roles = ['Admin','Sales Manager','Sales Team Lead','Sales Representatives'];
    for (const r of roles) {
      const existing = await Role.findOne({ name: r });
      if (!existing) {
        await Role.create({ name: r });
        console.log('Created role:', r);
      }
    }
    // Ensure default admin user
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const adminRole = await Role.findOne({ name: 'Admin' });
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({ name: 'Admin', email: adminEmail, passwordHash, role: adminRole._id });
      console.log('Created default admin user:', adminEmail);
    } else {
      console.log('Default admin already exists:', adminEmail);
    }
  } catch (e) {
    console.error('Error ensuring default admin:', e);
  }
};