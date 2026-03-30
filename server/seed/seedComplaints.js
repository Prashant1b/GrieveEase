require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const waterOfficer = await Officer.findOne({ email: 'officer1@grievease.demo' });
  const roadOfficer = await Officer.findOne({ email: 'officer2@grievease.demo' });

  await Complaint.deleteMany({});

  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const complaints = [
    {
      citizenPhone: '9876543210',
      originalText: 'Paani nahi aa raha 3 din se mere ghar mein',
      languageDetected: 'Hindi',
      aiSummary: 'Citizen reports no water supply for the past 3 days at their residence.',
      category: 'Water Supply',
      subcategory: 'No Supply',
      department: 'Municipal Water Board',
      priority: 'Critical',
      pinCode: '411045',
      areaName: 'Hadapsar',
      status: 'Filed',
      location: { type: 'Point', coordinates: [73.9412, 18.5019] },
      officerId: waterOfficer?._id,
      slaDeadline: daysFromNow(4),
      statusHistory: [{ status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' }]
    },
    {
      citizenPhone: '9876543211',
      originalText: 'Electricity bill wrong for 3 months, overcharged by 3000 rupees',
      languageDetected: 'English',
      aiSummary: 'Citizen has been overcharged on their electricity bill for the past 3 months by approximately 3000 rupees.',
      category: 'Electricity',
      subcategory: 'Billing Error',
      department: 'State Electricity Board (DISCOM)',
      priority: 'Medium',
      pinCode: '411001',
      areaName: 'Shivajinagar',
      status: 'In Progress',
      location: { type: 'Point', coordinates: [73.8429, 18.5308] },
      slaDeadline: daysFromNow(3),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'In Progress', note: 'Bill audit initiated', updatedBy: 'officer' }
      ]
    },
    {
      citizenPhone: '9876543212',
      originalText: 'Large pothole on main road near school, 2 accidents already happened',
      languageDetected: 'English',
      aiSummary: 'A large pothole on the main road near a school has caused 2 accidents. Immediate repair needed for public safety.',
      category: 'Roads',
      subcategory: 'Pothole',
      department: 'Public Works Department (PWD)',
      priority: 'Critical',
      pinCode: '411002',
      areaName: 'Koregaon Park',
      status: 'Routed',
      location: { type: 'Point', coordinates: [73.8929, 18.5362] },
      officerId: roadOfficer?._id,
      slaDeadline: daysFromNow(2),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'Routed', note: 'Routed to PWD', updatedBy: 'system' }
      ]
    },
    {
      citizenPhone: '9876543213',
      originalText: 'Garbage not collected for 1 week, smell is unbearable',
      languageDetected: 'English',
      aiSummary: 'Garbage has not been collected for over a week in the area, causing an unbearable smell.',
      category: 'Sanitation',
      subcategory: 'Garbage Not Collected',
      department: 'Municipal Sanitation Dept',
      priority: 'High',
      pinCode: '411046',
      areaName: 'Wanowrie',
      status: 'Escalated',
      isSystemic: true,
      escalationLevel: 1,
      location: { type: 'Point', coordinates: [73.9012, 18.4870] },
      slaDeadline: daysAgo(2),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'Escalated', note: 'Auto-escalated: SLA exceeded', updatedBy: 'system' }
      ]
    },
    {
      citizenPhone: '9876543214',
      originalText: 'Street light not working near temple since Diwali',
      languageDetected: 'English',
      aiSummary: 'A street light near the temple has been non-functional since Diwali, creating a safety concern.',
      category: 'Street Lights',
      subcategory: 'Light Not Working',
      department: 'Municipal Electrical Dept',
      priority: 'Low',
      pinCode: '411003',
      areaName: 'Deccan Gymkhana',
      status: 'Resolved',
      resolvedAt: daysAgo(2),
      location: { type: 'Point', coordinates: [73.8478, 18.5179] },
      slaDeadline: daysFromNow(5),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'Resolved', note: 'Street light repaired and tested', updatedBy: 'officer' }
      ]
    },
    {
      citizenPhone: '9876543215',
      originalText: 'Ration card not updated, not getting full ration for 2 months',
      languageDetected: 'English',
      aiSummary: 'Citizen\'s ration card has not been updated for 2 months, resulting in incomplete ration allocation.',
      category: 'Ration / PDS',
      subcategory: 'Card Not Updated',
      department: 'Food & Civil Supplies Dept',
      priority: 'High',
      pinCode: '411045',
      areaName: 'Hadapsar',
      status: 'Escalated',
      escalationLevel: 2,
      location: { type: 'Point', coordinates: [73.9350, 18.4990] },
      officerId: waterOfficer?._id,
      slaDeadline: daysAgo(5),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'Escalated', note: 'Citizen reported issue not resolved', updatedBy: 'citizen' }
      ]
    },
    {
      citizenPhone: '9876543216',
      originalText: 'Hospital OPD has been closed for 3 days, patients being turned away',
      languageDetected: 'English',
      aiSummary: 'The hospital OPD has been closed for 3 consecutive days, turning away patients who need medical attention.',
      category: 'Hospital / Health',
      subcategory: 'OPD Closed',
      department: 'District Health Office',
      priority: 'Critical',
      pinCode: '411047',
      areaName: 'Magarpatta',
      status: 'In Progress',
      location: { type: 'Point', coordinates: [73.9281, 18.5122] },
      slaDeadline: daysFromNow(1),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'In Progress', note: 'Health dept notified, investigation underway', updatedBy: 'officer' }
      ]
    },
    {
      citizenPhone: '9876543217',
      originalText: 'Water supply issue was resolved, pipes fixed properly now',
      languageDetected: 'English',
      aiSummary: 'The water supply issue has been resolved, pipes have been fixed and supply is restored.',
      category: 'Water Supply',
      subcategory: 'Supply Restored',
      department: 'Municipal Water Board',
      priority: 'Low',
      pinCode: '411046',
      areaName: 'Wanowrie',
      status: 'Closed',
      citizenConfirmed: true,
      resolvedAt: daysAgo(1),
      location: { type: 'Point', coordinates: [73.9050, 18.4850] },
      officerId: waterOfficer?._id,
      slaDeadline: daysFromNow(6),
      statusHistory: [
        { status: 'Filed', note: 'Complaint filed by citizen', updatedBy: 'system' },
        { status: 'Resolved', note: 'Pipes repaired and supply restored', updatedBy: 'officer' },
        { status: 'Closed', note: 'Citizen confirmed resolution', updatedBy: 'citizen' }
      ]
    }
  ];

  for (const data of complaints) {
    const c = new Complaint(data);
    await c.save();
  }

  console.log('Demo complaints seeded successfully');
  process.exit(0);
}

seed().catch(console.error);
