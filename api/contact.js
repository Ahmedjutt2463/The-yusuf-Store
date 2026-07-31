require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia','Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:30px 10px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px 40px;text-align:center;">
            <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:700;letter-spacing:2px;">NEW MESSAGE</h1>
            <p style="color:#a89070;margin:6px 0 0;font-size:13px;letter-spacing:1px;">CONTACT FORM - THE YUSUF STORE</p>
          </td>
        </tr>
        <tr><td style="padding:35px 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0;border-radius:6px;padding:18px 20px;margin-bottom:20px;">
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Name</td><td style="font-size:14px;color:#1a1a2e;font-weight:700;text-align:right;padding:3px 0;">${name}</td></tr>
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Email</td><td style="font-size:14px;color:#1a1a2e;text-align:right;padding:3px 0;">${email}</td></tr>
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Subject</td><td style="font-size:14px;color:#1a1a2e;text-align:right;padding:3px 0;">${subject}</td></tr>
          </table>
          <h3 style="color:#1a1a2e;font-size:15px;margin:0 0 8px;">Message</h3>
          <p style="font-size:14px;color:#5a4a3a;margin:0;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"The Yusuf Store" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `New Contact Message - ${subject} - from ${name}`,
      html
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Contact email send failed:', err.message);
    res.status(500).json({
      error: 'Failed to send message.',
      details: err.message
    });
  }
};
