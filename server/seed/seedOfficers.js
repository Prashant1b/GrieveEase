require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Officer = require('../models/Officer');

const officers = [
  {
    name: 'Rajesh Kumar',
    email: 'officer1@grievease.demo',
    password: 'demo123',
    department: 'Municipal Water Board',
    zone: 'Zone 4',
    pinCodes: ['411045', '411046', '411047'],
    role: 'officer'
  },
  {
    name: 'Priya Sharma',
    email: 'officer2@grievease.demo',
    password: 'demo123',
    department: 'Public Works Department (PWD)',
    zone: 'Zone 2',
    pinCodes: ['411001', '411002', '411003'],
    role: 'officer'
  },
  {
    name: 'Amit Desai',
    email: 'senior@grievease.demo',
    password: 'demo123',
    department: 'General Administration',
    zone: 'All Zones',
    pinCodes: ['411001','411002','411003','411045','411046'],
    role: 'senior_officer'
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Officer.deleteMany({});
  await Officer.insertMany(officers);
  console.log('Officers seeded successfully');
  process.exit(0);
}

seed().catch(console.error);
