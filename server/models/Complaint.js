const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
  },
  citizenPhone: { type: String, required: true },
  originalText: { type: String, required: true },
  languageDetected: { type: String, default: 'English' },
  aiSummary: { type: String },
  category: { type: String },
  subcategory: { type: String },
  department: { type: String },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Filed', 'Routed', 'In Progress', 'Resolved', 'Closed', 'Escalated'],
    default: 'Filed'
  },
  pinCode: { type: String },
  areaName: { type: String },
  district: { type: String },
  state: { type: String },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  photoUrl: { type: String },
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
  officerNotes: { type: String },
  resolutionProof: { type: String },
  citizenConfirmed: { type: Boolean, default: false },
  isSystemic: { type: Boolean, default: false },
  escalationLevel: { type: Number, default: 0 },
  slaDeadline: { type: Date },
  resolvedAt: { type: Date },
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: { type: String },
  ratedAt: { type: Date },
  citizenEmail: { type: String },
  supporters: [{
    email: String,
    phone: String,
    addedAt: { type: Date, default: Date.now }
  }],
  supporterCount: { type: Number, default: 0 },
  duplicateOf: { type: String },
  relatedTickets: [String],
  statusHistory: [{
    status: String,
    note: String,
    updatedBy: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

complaintSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments();
    this.ticketId = `GRV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.slaDeadline) {
    this.slaDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ pinCode: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ officerId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
