const axios = require('axios');

function getSender() {
  const from = process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM;
  if (!from) {
    return { name: 'GrievEase', email: 'noreply@grievease.in' };
  }

  const match = from.match(/^\s*"?([^"<]+)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  return { name: 'GrievEase', email: from.replace(/"/g, '').trim() };
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { success: true, mock: true };
  }
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: getSender(),
        to: [{ email: to }],
        subject,
        htmlContent: html
      }, {
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        timeout: 20000
      });
      console.log(`[EMAIL] Sent to ${to}: ${subject}`);
      return { success: true };
    } catch (err) {
      lastError = err;
      console.error(`[EMAIL ERROR][Attempt ${attempt}]`, err.response?.data || err.message);
    }
  }
  const errorText = lastError?.response?.data?.message || lastError?.response?.data?.code || lastError?.message || 'Email delivery failed';
  return { success: false, error: errorText };
}

async function sendOTP(email, otp) {
  return sendEmail({
    to: email,
    subject: `GrievEase — Your OTP is ${otp}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e40af;">GrievEase</h2>
      <p style="color:#64748b;font-size:14px;">Your one-time verification code is:</p>
      <div style="background:#1e40af;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;border-radius:8px;margin:16px 0;">${otp}</div>
      <p style="color:#64748b;font-size:12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>`
  });
}

async function sendComplaintUpdate(email, ticketId, status, note) {
  return sendEmail({
    to: email,
    subject: `GrievEase — Update on ${ticketId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e40af;">GrievEase</h2>
      <p style="color:#334155;">Your complaint <strong>${ticketId}</strong> has been updated:</p>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#1e40af;font-weight:bold;font-size:16px;">Status: ${status}</p>
        ${note ? `<p style="margin:8px 0 0;color:#64748b;font-size:13px;">${note}</p>` : ''}
      </div>
      <a href="${process.env.CLIENT_URL}/track?id=${ticketId}" style="display:inline-block;background:#1e40af;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;">Track Your Complaint</a>
    </div>`
  });
}

async function sendSLABreachAlert(officerEmail, officerName, ticketId, category, daysOverdue) {
  return sendEmail({
    to: officerEmail,
    subject: `SLA BREACH — ${ticketId} overdue by ${daysOverdue} days`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fef2f2;border-radius:12px;">
      <h2 style="color:#dc2626;">SLA Breach Alert</h2>
      <p style="color:#334155;">Dear ${officerName},</p>
      <div style="background:white;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 4px;"><strong>Ticket:</strong> ${ticketId}</p>
        <p style="margin:0 0 4px;"><strong>Category:</strong> ${category}</p>
        <p style="margin:0;color:#dc2626;font-weight:bold;">Overdue by ${daysOverdue} days</p>
      </div>
      <p style="color:#64748b;font-size:13px;">This complaint has been auto-escalated. Please take immediate action.</p>
    </div>`
  });
}

module.exports = { sendEmail, sendOTP, sendComplaintUpdate, sendSLABreachAlert };
