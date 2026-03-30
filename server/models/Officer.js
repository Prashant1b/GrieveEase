const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const officerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  zone: { type: String },
  pinCodes: [String],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  role: {
    type: String,
    enum: ['junior_officer', 'officer', 'sub_senior_officer', 'senior_officer', 'district_collector', 'admin'],
    default: 'junior_officer'
  },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', default: null },
  resolutionCount: { type: Number, default: 0 },
  avgResolutionHours: { type: Number, default: 0 },
  slaBreachCount: { type: Number, default: 0 },
  otp: { type: String },
  otpExpiry: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

officerSchema.index({ location: '2dsphere' });

officerSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

officerSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Officer', officerSchema);
