const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  type: { type: String, enum: ['sms', 'whatsapp'] },
  message: String,
  status: { type: String, default: 'sent' }
}, { timestamps: true });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
