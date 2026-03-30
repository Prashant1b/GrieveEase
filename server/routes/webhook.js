const router = require('express').Router();
const Complaint = require('../models/Complaint');
const { analyzeComplaint } = require('../services/claudeAI');

router.post('/whatsapp', async (req, res) => {
  try {
    const { Body, From, ProfileName } = req.body;
    const phone = From?.replace('whatsapp:', '') || '';
    const message = (Body || '').trim();

    console.log(`[WhatsApp] From: ${phone} (${ProfileName}) | Message: ${message}`);

    // Track by ticket ID
    if (/^GRV-\d{4}-\d{5}$/i.test(message)) {
      const complaint = await Complaint.findOne({ ticketId: message.toUpperCase() });
      if (complaint) {
        const reply = `*${complaint.ticketId}*\n${complaint.category}\nStatus: *${complaint.status}*\nFiled: ${new Date(complaint.createdAt).toLocaleDateString('en-IN')}\n${complaint.aiSummary || ''}`;
        return res.set('Content-Type', 'text/xml').send(twiml(reply));
      }
      return res.set('Content-Type', 'text/xml').send(twiml('Ticket not found. Please check the ID.'));
    }

    // List complaints by phone
    if (message.toUpperCase().startsWith('TRACK')) {
      const complaints = await Complaint.find({ citizenPhone: phone }).sort({ createdAt: -1 }).limit(5);
      if (complaints.length === 0) {
        return res.set('Content-Type', 'text/xml').send(twiml('No complaints found for your number.'));
      }
      let reply = 'Your recent complaints:\n\n';
      complaints.forEach(c => { reply += `*${c.ticketId}* - ${c.category} - *${c.status}*\n`; });
      reply += '\nReply with a Ticket ID to see full details.';
      return res.set('Content-Type', 'text/xml').send(twiml(reply));
    }

    // File complaint via WhatsApp
    if (message.length >= 15) {
      try {
        const analysis = await analyzeComplaint(message);
        const complaint = new Complaint({
          citizenPhone: phone,
          originalText: message,
          aiSummary: analysis.aiSummary,
          languageDetected: analysis.languageDetected,
          category: analysis.category,
          subcategory: analysis.subcategory,
          department: analysis.department,
          priority: analysis.priority,
          pinCode: analysis.location?.pinCode || undefined,
          areaName: analysis.location?.areaName || undefined,
          district: analysis.location?.district || undefined,
          state: analysis.location?.state || undefined,
          statusHistory: [{ status: 'Filed', note: 'Filed via WhatsApp', updatedBy: 'system' }]
        });
        await complaint.save();
        const reply = `Complaint filed!\n\nTicket: *${complaint.ticketId}*\n${complaint.category}\nDept: ${complaint.department}\nPriority: ${complaint.priority}\n\nReply with Ticket ID to check status.\nType *TRACK* to see all complaints.`;
        return res.set('Content-Type', 'text/xml').send(twiml(reply));
      } catch (aiErr) {
        console.error('WhatsApp AI error:', aiErr);
        return res.set('Content-Type', 'text/xml').send(twiml('Sorry, could not process. Please try again with more details.'));
      }
    }

    // Help
    const help = 'Welcome to *GrievEase*!\n\nFile: Type your problem (min 15 chars)\nTrack: Reply with Ticket ID (e.g. GRV-2024-00001)\nMy complaints: Type TRACK';
    res.set('Content-Type', 'text/xml').send(twiml(help));
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.set('Content-Type', 'text/xml').send(twiml('An error occurred. Please try again.'));
  }
});

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`;
}

module.exports = router;
