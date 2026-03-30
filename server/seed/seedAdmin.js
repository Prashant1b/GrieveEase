require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Officer = require('../models/Officer');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Get existing officers for hierarchy
  const seniorOfficer = await Officer.findOne({ email: 'senior@grievease.demo' });
  const officer1 = await Officer.findOne({ email: 'officer1@grievease.demo' });
  const officer2 = await Officer.findOne({ email: 'officer2@grievease.demo' });

  // Update existing officers to use new role names and set hierarchy
  await Officer.updateOne({ email: 'officer1@grievease.demo' }, {
    role: 'junior_officer',
    supervisorId: seniorOfficer?._id
  });
  await Officer.updateOne({ email: 'officer2@grievease.demo' }, {
    role: 'junior_officer',
    supervisorId: seniorOfficer?._id
  });
  await Officer.updateOne({ email: 'senior@grievease.demo' }, {
    role: 'senior_officer'
  });

  // Create sub-senior officer
  const subSeniorExists = await Officer.findOne({ email: 'subsenior@grievease.demo' });
  if (!subSeniorExists) {
    const subSenior = new Officer({
      name: 'Kavya Nair',
      email: 'subsenior@grievease.demo',
      password: 'demo123',
      department: 'Municipal Water Board',
      zone: 'Zone 3',
      pinCodes: ['411048', '411049'],
      role: 'sub_senior_officer',
      supervisorId: seniorOfficer?._id
    });
    await subSenior.save();
    console.log('Sub-senior officer created');
  }

  // Create district collector
  const dcExists = await Officer.findOne({ email: 'collector@grievease.demo' });
  if (!dcExists) {
    const dc = new Officer({
      name: 'IAS Suresh Patil',
      email: 'collector@grievease.demo',
      password: 'demo123',
      department: 'District Collectorate',
      zone: 'Pune District',
      pinCodes: [],
      role: 'district_collector'
    });
    await dc.save();
    console.log('District collector created');
  }

  // Create admin
  const adminExists = await Officer.findOne({ email: 'admin@grievease.demo' });
  if (!adminExists) {
    const admin = new Officer({
      name: 'System Admin',
      email: 'admin@grievease.demo',
      password: 'admin123',
      department: 'Administration',
      zone: 'All',
      pinCodes: [],
      role: 'admin'
    });
    await admin.save();
    console.log('Admin created');
  }

  console.log('Hierarchy seed complete');
  process.exit(0);
}

seed().catch(console.error);
