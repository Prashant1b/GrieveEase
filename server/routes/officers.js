const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/officers/complaints — hierarchy-aware complaint listing
router.get('/complaints', authMiddleware, async (req, res) => {
  try {
    const { status, priority, page = 1 } = req.query;
    const officer = req.officer;

    let filter = {};

    if (['admin', 'district_collector'].includes(officer.role)) {
      filter = {};
    } else if (officer.role === 'senior_officer') {
      const directReports = await Officer.find({ supervisorId: officer._id }).select('_id');
      const directIds = directReports.map(o => o._id);
      const indirectReports = await Officer.find({ supervisorId: { $in: directIds } }).select('_id');
      const allIds = [officer._id, ...directIds, ...indirectReports.map(o => o._id)];
      filter = { officerId: { $in: allIds } };
    } else if (officer.role === 'sub_senior_officer') {
      const juniors = await Officer.find({ supervisorId: officer._id }).select('_id');
      const allIds = [officer._id, ...juniors.map(o => o._id)];
      filter = { officerId: { $in: allIds } };
    } else {
      filter = { officerId: officer._id };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint
      .find(filter)
      .populate('officerId', 'name department role')
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * 20)
      .limit(20);

    const total = await Complaint.countDocuments(filter);
    res.json({ complaints, total, page });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// PATCH /api/officers/complaints/:id — update status
router.patch('/complaints/:id', authMiddleware, async (req, res) => {
  try {
    const { status, officerNotes, resolutionProof } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ error: 'Not found' });

    complaint.status = status;
    if (officerNotes) complaint.officerNotes = officerNotes;
    if (resolutionProof) complaint.resolutionProof = resolutionProof;
    if (status === 'Resolved') complaint.resolvedAt = new Date();

    complaint.statusHistory.push({
      status,
      note: officerNotes || `Status changed to ${status}`,
      updatedBy: req.officer.name
    });

    await complaint.save();

    const { sendNotification } = require('../services/twilio');
    await sendNotification(
      complaint.citizenPhone,
      `Update on ${complaint.ticketId}: Status is now "${status}". ${officerNotes || ''}`
    );

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/officers/stats — hierarchy-aware stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const officer = req.officer;
    let idFilter = {};

    if (['admin', 'district_collector'].includes(officer.role)) {
      idFilter = {};
    } else if (officer.role === 'senior_officer') {
      const directReports = await Officer.find({ supervisorId: officer._id }).select('_id');
      const directIds = directReports.map(o => o._id);
      const indirectReports = await Officer.find({ supervisorId: { $in: directIds } }).select('_id');
      const allIds = [officer._id, ...directIds, ...indirectReports.map(o => o._id)];
      idFilter = { officerId: { $in: allIds } };
    } else if (officer.role === 'sub_senior_officer') {
      const juniors = await Officer.find({ supervisorId: officer._id }).select('_id');
      const allIds = [officer._id, ...juniors.map(o => o._id)];
      idFilter = { officerId: { $in: allIds } };
    } else {
      idFilter = { officerId: officer._id };
    }

    const total = await Complaint.countDocuments(idFilter);
    const resolved = await Complaint.countDocuments({ ...idFilter, status: { $in: ['Resolved', 'Closed'] } });
    const overdue = await Complaint.countDocuments({
      ...idFilter,
      status: { $nin: ['Resolved', 'Closed'] },
      slaDeadline: { $lt: new Date() }
    });
    const systemic = await Complaint.countDocuments({ ...idFilter, isSystemic: true });
    res.json({ total, resolved, overdue, systemic });
  } catch (err) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

module.exports = router;
