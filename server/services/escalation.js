const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');
const { sendSLABreachAlert } = require('./email');

async function runEscalationCheck() {
  const now = new Date();

  const overdueComplaints = await Complaint.find({
    status: { $nin: ['Resolved', 'Closed', 'Escalated'] },
    slaDeadline: { $lt: now }
  }).populate('officerId', 'name email supervisorId');

  for (const complaint of overdueComplaints) {
    complaint.status = 'Escalated';
    complaint.escalationLevel += 1;
    complaint.statusHistory.push({
      status: 'Escalated',
      note: `Auto-escalated: SLA of 7 days exceeded. Escalation level: ${complaint.escalationLevel}`,
      updatedBy: 'system'
    });
    await complaint.save();
    console.log(`Escalated complaint: ${complaint.ticketId}`);

    // Send email to assigned officer
    if (complaint.officerId?.email) {
      const daysOverdue = Math.ceil((now - complaint.slaDeadline) / (1000 * 60 * 60 * 24));
      await sendSLABreachAlert(
        complaint.officerId.email,
        complaint.officerId.name,
        complaint.ticketId,
        complaint.category,
        daysOverdue
      );

      // Also alert supervisor
      if (complaint.officerId.supervisorId) {
        const supervisor = await Officer.findById(complaint.officerId.supervisorId);
        if (supervisor?.email) {
          await sendSLABreachAlert(
            supervisor.email,
            supervisor.name,
            complaint.ticketId,
            complaint.category,
            daysOverdue
          );
        }
      }
    }
  }

  console.log(`Escalation check complete. ${overdueComplaints.length} complaints escalated.`);
}

module.exports = { runEscalationCheck };
