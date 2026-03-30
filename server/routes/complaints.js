const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');
const Citizen = require('../models/Citizen');
const { checkSystemicIssue } = require('../services/claudeAI');
const { sendNotification } = require('../services/twilio');
const { sendComplaintUpdate } = require('../services/email');

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from, to) {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  if ((fromLng === 0 && fromLat === 0) || (toLng === 0 && toLat === 0)) return Number.POSITIVE_INFINITY;

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findBestOfficer({ department, pinCode, coordinates }) {
  const officers = await Officer.find({
    isActive: true,
    role: { $nin: ['admin', 'district_collector'] }
  });

  if (!officers.length) return null;

  const ranked = officers
    .map((officer) => ({
      officer,
      departmentMatch: department
        ? new RegExp(department, 'i').test(officer.department) || new RegExp(officer.department, 'i').test(department)
        : false,
      matchesPin: Array.isArray(officer.pinCodes) && pinCode ? officer.pinCodes.includes(pinCode) : false,
      distanceKm: getDistanceInKm(coordinates, officer.location?.coordinates || [0, 0])
    }))
    .sort((a, b) => {
      if (a.departmentMatch !== b.departmentMatch) return a.departmentMatch ? -1 : 1;
      if (a.matchesPin !== b.matchesPin) return a.matchesPin ? -1 : 1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return String(a.officer.name).localeCompare(String(b.officer.name));
    });

  return ranked[0]?.officer || null;
}

function getRewardTier(points) {
  if (points >= 250) return 'Platinum';
  if (points >= 150) return 'Gold';
  if (points >= 75) return 'Silver';
  return 'Bronze';
}

async function trackCitizenComplaintFiled({ citizenEmail, citizenPhone }) {
  if (!citizenEmail) return;

  const citizen = await Citizen.findOne({ email: citizenEmail.toLowerCase() });
  if (!citizen) return;

  citizen.complaintsFiled += 1;
  if (!citizen.phone && citizenPhone) citizen.phone = citizenPhone;
  await citizen.save();
}

async function creditCitizenReward(complaint) {
  if (complaint.rewardCredited || !complaint.citizenEmail) return;

  const citizen = await Citizen.findOne({ email: complaint.citizenEmail.toLowerCase() });
  if (!citizen) return;

  const rewardPoints =
    20 +
    (complaint.priority === 'Critical' ? 15 : complaint.priority === 'High' ? 10 : 0) +
    (complaint.isSystemic ? 10 : 0);

  citizen.resolvedComplaints += 1;
  citizen.genuineComplaints += 1;
  citizen.rewardPoints += rewardPoints;
  citizen.rewardTier = getRewardTier(citizen.rewardPoints);
  citizen.lastRewardedAt = new Date();
  if (!citizen.phone && complaint.citizenPhone) citizen.phone = complaint.citizenPhone;
  await citizen.save();

  complaint.genuineResolved = true;
  complaint.rewardCredited = true;
}

router.post('/', async (req, res) => {
  try {
    const {
      citizenPhone, originalText, aiSummary, languageDetected,
      category, subcategory, department, priority,
      pinCode, areaName, district, state, latitude, longitude, photoUrl, citizenEmail
    } = req.body;
    const complaintCoordinates = [parseFloat(longitude) || 0, parseFloat(latitude) || 0];

    const isSystemic = await checkSystemicIssue(pinCode, category);

    const complaint = new Complaint({
      citizenPhone,
      originalText,
      aiSummary,
      languageDetected,
      category,
      subcategory,
      department,
      priority,
      pinCode,
      areaName,
      district,
      state,
      photoUrl,
      citizenEmail,
      isSystemic,
      location: {
        type: 'Point',
        coordinates: complaintCoordinates
      },
      statusHistory: [{
        status: 'Filed',
        note: 'Complaint filed by citizen',
        updatedBy: 'system'
      }]
    });

    await complaint.save();
    await trackCitizenComplaintFiled({ citizenEmail, citizenPhone });

    let duplicates = [];
    if (pinCode && category) {
      duplicates = await Complaint.find({
        category,
        pinCode,
        status: { $nin: ['Resolved', 'Closed'] },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        _id: { $ne: complaint._id }
      }).select('ticketId status createdAt').limit(5).lean();

      if (duplicates.length > 0) {
        complaint.relatedTickets = duplicates.map(d => d.ticketId);
        await Complaint.updateMany(
          { ticketId: { $in: duplicates.map(d => d.ticketId) } },
          { $addToSet: { relatedTickets: complaint.ticketId } }
        );
      }
    }

    const officer = await findBestOfficer({
      department,
      pinCode,
      coordinates: complaintCoordinates
    });

    if (officer) {
      complaint.officerId = officer._id;
      complaint.status = 'Routed';
      complaint.statusHistory.push({
        status: 'Routed',
        note: `Routed to ${officer.name} - ${officer.department}`,
        updatedBy: 'system'
      });
      await complaint.save();
    }

    const notificationMessage = `Your complaint has been filed on GrievEase. Ticket ID: ${complaint.ticketId}. Track at grievease.in/track`;
    const smsResult = await sendNotification(citizenPhone, notificationMessage);
    if (!smsResult?.success && citizenEmail) {
      await sendComplaintUpdate(
        citizenEmail,
        complaint.ticketId,
        complaint.status,
        'Your complaint has been filed successfully and routed for review.'
      );
    }

    res.status(201).json({
      ticketId: complaint.ticketId,
      status: complaint.status,
      assignedOfficer: officer ? {
        id: officer._id,
        name: officer.name,
        department: officer.department,
        zone: officer.zone
      } : null,
      isSystemic: complaint.isSystemic,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      duplicateCount: duplicates.length,
      message: 'Complaint filed successfully'
    });
  } catch (err) {
    console.error('File complaint error:', err);
    res.status(500).json({ error: 'Failed to file complaint' });
  }
});

router.get('/map/all', async (req, res) => {
  try {
    const complaints = await Complaint.find(
      { 'location.coordinates.0': { $ne: 0 } },
      'ticketId category status priority location pinCode areaName createdAt slaDeadline'
    ).limit(500);
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
    const overdue = await Complaint.countDocuments({
      status: { $nin: ['Resolved', 'Closed'] },
      slaDeadline: { $lt: new Date() }
    });
    const byDept = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    res.json({ total, resolved, overdue, byDept });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/citizen/:phone', async (req, res) => {
  try {
    const lookup = String(req.params.phone || '').trim();
    const complaints = await Complaint
      .find({
        $or: [
          { citizenPhone: lookup },
          { citizenEmail: lookup.toLowerCase() }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.get('/rewards/leaderboard', async (req, res) => {
  try {
    const citizens = await Citizen.find(
      { genuineComplaints: { $gt: 0 } },
      'name email genuineComplaints resolvedComplaints rewardPoints rewardTier complaintsFiled'
    )
      .sort({ genuineComplaints: -1, rewardPoints: -1, resolvedComplaints: -1, createdAt: 1 })
      .limit(10)
      .lean();

    res.json(citizens.map((citizen, index) => ({
      rank: index + 1,
      ...citizen,
      displayName: citizen.name || citizen.email.split('@')[0]
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/rewards/citizen/:email', async (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const citizen = await Citizen.findOne(
      { email },
      'name email complaintsFiled resolvedComplaints genuineComplaints rewardPoints rewardTier lastRewardedAt'
    ).lean();

    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

    const higherRanked = await Citizen.countDocuments({
      $or: [
        { genuineComplaints: { $gt: citizen.genuineComplaints } },
        {
          genuineComplaints: citizen.genuineComplaints,
          rewardPoints: { $gt: citizen.rewardPoints }
        }
      ]
    });

    res.json({
      ...citizen,
      displayName: citizen.name || citizen.email.split('@')[0],
      rank: higherRanked + 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch citizen rewards' });
  }
});

router.get('/:ticketId', async (req, res) => {
  try {
    const complaint = await Complaint
      .findOne({ ticketId: req.params.ticketId })
      .populate('officerId', 'name department zone');

    if (!complaint) return res.status(404).json({ error: 'Ticket not found' });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

router.patch('/:id/confirm', async (req, res) => {
  try {
    const { resolved } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ error: 'Not found' });

    if (resolved) {
      complaint.status = 'Closed';
      complaint.citizenConfirmed = true;
      await creditCitizenReward(complaint);
      complaint.statusHistory.push({
        status: 'Closed',
        note: 'Citizen confirmed resolution',
        updatedBy: 'citizen'
      });
    } else {
      complaint.status = 'Escalated';
      complaint.escalationLevel += 1;
      complaint.statusHistory.push({
        status: 'Escalated',
        note: 'Citizen reported issue not resolved. Escalated.',
        updatedBy: 'citizen'
      });
    }

    await complaint.save();
    res.json({ message: 'Updated', status: complaint.status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.patch('/:id/rate', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    if (!['Resolved', 'Closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Can only rate resolved complaints' });
    }
    complaint.rating = rating;
    complaint.ratingComment = comment || '';
    complaint.ratedAt = new Date();
    complaint.statusHistory.push({
      status: complaint.status,
      note: `Citizen rated ${rating}/5${comment ? ': ' + comment : ''}`,
      updatedBy: 'citizen'
    });
    await complaint.save();
    res.json({ message: 'Rating saved', rating: complaint.rating });
  } catch (err) {
    res.status(500).json({ error: 'Rating failed' });
  }
});

router.post('/:ticketId/support', async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

    const complaint = await Complaint.findOne({ ticketId: req.params.ticketId });
    if (!complaint) return res.status(404).json({ error: 'Ticket not found' });

    const alreadySupported = complaint.supporters.some(
      s => (email && s.email === email) || (phone && s.phone === phone)
    );
    if (alreadySupported) return res.status(400).json({ error: 'You have already supported this complaint' });

    complaint.supporters.push({ email, phone });
    complaint.supporterCount = complaint.supporters.length;
    await complaint.save();
    res.json({ message: 'Support added', supporterCount: complaint.supporterCount });
  } catch (err) {
    res.status(500).json({ error: 'Support failed' });
  }
});

module.exports = router;
