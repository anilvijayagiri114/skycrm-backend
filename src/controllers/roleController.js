// ...existing code...

// Get role ObjectId by role name
export const getRoleIdByName = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Role name required' });
  try {
    const role = await Role.findOne({ name });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ roleId: role._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import Role from '../models/Role.js';
export const listRoles = async (req, res) => {
  const roles = await Role.find().sort('name');
  res.json(roles);
};
