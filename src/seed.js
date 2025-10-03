import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from './config/db.js';
import Role from './models/Role.js';
import User from './models/User.js';
import Status from './models/Status.js';
import Team from './models/Team.js';
import Lead from './models/Lead.js';

const run = async () => {
  await connectDB();
  const roles = ['Admin','Sales Manager','Sales Team Lead','Sales Representatives'];
  const roleDocs = {};
  for (let i=0;i<roles.length;i++) {
    roleDocs[roles[i]] = await Role.findOneAndUpdate({ name: roles[i] }, { name: roles[i] }, { upsert: true, new: true });
  }

  const users = [
    { name:'Admin', email:'admin@gmail.com', pass:'Admin@123', role:'Admin' },
    { name:'Sales Manager', email:'manager@test.com', pass:'manager@123', role:'Sales Manager' },
    { name:'Sales Team Lead', email:'lead@test.com', pass:'lead@123', role:'Sales Team Lead' },
    { name:'Sales Representatives', email:'rep@test.com', pass:'rep@123', role:'Sales Representatives' },
  ];

  const created = {};
  for (const u of users) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      const passwordHash = await bcrypt.hash(u.pass, 10);
      user = await User.create({ name: u.name, email: u.email, passwordHash, role: roleDocs[u.role]._id });
    }
    created[u.role] = user;
  }

  const statusOrder = ['New','Contacted','Registered','Interested','Call Back','Follow-Up','Not Interested','Enrolled'];
  for (let i=0;i<statusOrder.length;i++) {
    await Status.findOneAndUpdate({ name: statusOrder[i] }, { name: statusOrder[i], order: i+1 }, { upsert: true });
  }

  let team = await Team.findOne({ name: 'Alpha Team' });
  if (!team) {
    team = await Team.create({
      name: 'Alpha Team',
      manager: created['Sales Manager']._id,
      lead: created['Sales Team Lead']._id,
      members: [created['Sales Representatives']._id]
    });
  }

  const statuses = await Status.find();
  const statusByName = Object.fromEntries(statuses.map(s => [s.name, s]));
  const samples = [
    { name:'John Doe', phone:'9991112222', email:'john@example.com', source:'Web', status:'New' },
    { name:'Jane Smith', phone:'9991113333', email:'jane@example.com', source:'Ads', status:'Contacted' },
    { name:'Raj Kumar', phone:'8887776666', email:'raj@example.com', source:'Event', status:'Interested' },
    { name:'Priya Iyer', phone:'7776665555', email:'priya@example.com', source:'Web', status:'Follow-Up' },
  ];
  for (const s of samples) {
    let exists = await Lead.findOne({ phone: s.phone });
    if (!exists) {
      await Lead.create({
        name: s.name, phone: s.phone, email: s.email, source: s.source,
        assignedTo: created['Sales Representatives']._id,
        teamId: team._id,
        status: statusByName[s.status]._id,
        history: [{ status: statusByName[s.status]._id, by: created['Sales Manager']._id, at: new Date() }],
        notes: []
      });
    }
  }

  console.log('Seed complete');
  await mongoose.disconnect();
};
run().catch(e => { console.error(e); process.exit(1); });
