import Lead from '../models/Lead.js';
import Team from '../models/Team.js';
import Status from '../models/Status.js';

export const teamStats = async (req, res) => {
  const teamId = req.params.id;
  const statuses = await Status.find().sort('order');
  const leads = await Lead.find({ teamId });
  const buckets = Object.fromEntries(statuses.map(s => [s.name, 0]));
  leads.forEach(l => {
    const st = statuses.find(s => String(s._id) === String(l.status));
    if (st) buckets[st.name]++;
  });
  res.json({ teamId, buckets });
};

export const teamMembersStats = async (req, res) => {
  const teamId = req.params.id;
  const statuses = await Status.find().sort('order');
  const leads = await Lead.find({ teamId }).populate('assignedTo','name');
  const byUser = {};
  leads.forEach(l => {
    const key = l.assignedTo ? String(l.assignedTo._id) : 'unassigned';
    if (!byUser[key]) byUser[key] = { userId: key, name: l.assignedTo?.name || 'Unassigned', buckets: {} };
    const st = statuses.find(s => String(s._id) === String(l.status));
    const name = st?.name || 'Unknown';
    byUser[key].buckets[name] = (byUser[key].buckets[name] || 0) + 1;
  });
  // Fill missing buckets with 0
  const result = Object.values(byUser).map(row => {
    statuses.forEach(s => { if (!(s.name in row.buckets)) row.buckets[s.name] = 0; });
    return row;
  });
  res.json(result);
};

export const myStats = async (req, res) => {
  const userId = req.user.userId;
  const statuses = await Status.find().sort('order');
  const leads = await Lead.find({ assignedTo: userId });
  const buckets = Object.fromEntries(statuses.map(s => [s.name, 0]));
  leads.forEach(l => {
    const st = statuses.find(s => String(s._id) === String(l.status));
    if (st) buckets[st.name]++;
  });
  res.json({ userId, buckets });
};
