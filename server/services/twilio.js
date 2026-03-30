async function sendNotification(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE;

  if (!accountSid || !authToken || !fromPhone || !/^AC[a-zA-Z0-9]{32}$/.test(accountSid)) {
    console.log(`[SMS MOCK] To: ${phone} | Message: ${message}`);
    return { success: false, mock: true };
  }

  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: message,
      from: fromPhone,
      to: phone
    });
    return { success: true };
  } catch (err) {
    console.error('[SMS ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendNotification };
