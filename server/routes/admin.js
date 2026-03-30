const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const bcrypt = require('bcryptjs');

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/stats — full system stats
router.get('/stats', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
    const overdue = await Complaint.countDocuments({
      status: { $nin: ['Resolved', 'Closed'] },
      slaDeadline: { $lt: new Date() }
    });
    const escalated = await Complaint.countDocuments({ status: 'Escalated' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const filed = await Complaint.countDocuments({ status: 'Filed' });
    const systemic = await Complaint.countDocuments({ isSystemic: true });

    const byDept = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } } } },
      { $sort: { count: -1 } }
    ]);

    const byPriority = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalOfficers = await Officer.countDocuments({ isActive: true });

    res.json({ total, resolved, overdue, escalated, inProgress, filed, systemic, byDept, byPriority, totalOfficers });
  } catch (err) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

// GET /api/admin/complaints — all complaints with filters
router.get('/complaints', async (req, res) => {
  try {
    const { status, priority, department, officerId, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (officerId) filter.officerId = officerId === 'unassigned' ? null : officerId;
    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { originalText: { $regex: search, $options: 'i' } },
        { citizenPhone: { $regex: search } },
        { areaName: { $regex: search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate('officerId', 'name department role zone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);
    res.json({ complaints, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// PATCH /api/admin/complaints/:id — admin update (reassign, change status, etc.)
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { officerId, status, officerNotes, priority } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Not found' });

    if (officerId !== undefined) {
      complaint.officerId = officerId || null;
      if (officerId) {
        const officer = await Officer.findById(officerId);
        complaint.statusHistory.push({
          status: complaint.status,
          note: `Reassigned to ${officer?.name || 'officer'} by admin`,
          updatedBy: req.officer.name
        });
        if (complaint.status === 'Filed') {
          complaint.status = 'Routed';
          complaint.statusHistory.push({ status: 'Routed', note: 'Routed by admin', updatedBy: req.officer.name });
        }
      }
    }
    if (status) {
      complaint.status = status;
      complaint.statusHistory.push({ status, note: officerNotes || `Status changed by admin`, updatedBy: req.officer.name });
      if (status === 'Resolved') complaint.resolvedAt = new Date();
    }
    if (priority) complaint.priority = priority;
    if (officerNotes) complaint.officerNotes = officerNotes;

    await complaint.save();
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/admin/officers — all officers with stats
router.get('/officers', async (req, res) => {
  try {
    const officers = await Officer.find()
      .populate('supervisorId', 'name role department')
      .sort({ role: 1, name: 1 });

    // Attach complaint stats to each officer
    const officerIds = officers.map(o => o._id);
    const stats = await Complaint.aggregate([
      { $match: { officerId: { $in: officerIds } } },
      { $group: {
        _id: '$officerId',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$slaDeadline', new Date()] }, { $not: { $in: ['$status', ['Resolved', 'Closed']] } }] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] } }
      }}
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[s._id.toString()] = s; });

    const result = officers.map(o => ({
      ...o.toObject(),
      stats: statsMap[o._id.toString()] || { total: 0, resolved: 0, overdue: 0, escalated: 0 }
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

// POST /api/admin/officers — create new officer
router.post('/officers', async (req, res) => {
  try {
    const { name, email, password, department, zone, pinCodes, role, supervisorId } = req.body;
    const exists = await Officer.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const officer = new Officer({ name, email, password, department, zone, pinCodes: pinCodes || [], role, supervisorId: supervisorId || null });
    await officer.save();
    res.status(201).json({ message: 'Officer created', id: officer._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create officer' });
  }
});

// PATCH /api/admin/officers/:id — update officer
router.patch('/officers/:id', async (req, res) => {
  try {
    const { name, department, zone, pinCodes, role, supervisorId, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (department !== undefined) update.department = department;
    if (zone !== undefined) update.zone = zone;
    if (pinCodes !== undefined) update.pinCodes = pinCodes;
    if (role !== undefined) update.role = role;
    if (supervisorId !== undefined) update.supervisorId = supervisorId || null;
    if (isActive !== undefined) update.isActive = isActive;

    await Officer.findByIdAndUpdate(req.params.id, update);
    res.json({ message: 'Officer updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/admin/hierarchy — officer hierarchy tree
router.get('/hierarchy', async (req, res) => {
  try {
    const officers = await Officer.find({ isActive: true }).select('-password').lean();

    const buildTree = (officers, parentId = null) => {
      return officers
        .filter(o => {
          const supId = o.supervisorId ? o.supervisorId.toString() : null;
          return supId === (parentId ? parentId.toString() : null);
        })
        .map(o => ({
          ...o,
          children: buildTree(officers, o._id)
        }));
    };

    // Top-level: admin and district_collector have no supervisor
    const tree = buildTree(officers);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Failed to build hierarchy' });
  }
});

module.exports = router;
