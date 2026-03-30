const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  otp: { type: String },
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  complaintsFiled: { type: Number, default: 0 },
  resolvedComplaints: { type: Number, default: 0 },
  genuineComplaints: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  rewardTier: { type: String, default: 'Bronze' },
  lastRewardedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Citizen', citizenSchema);
