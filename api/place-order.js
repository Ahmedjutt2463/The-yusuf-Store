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

  const { name, email, phone, address, items, total } = req.body;

  if (!name || !email || !phone || !address || !items || !total) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const orderId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  const order = {
    id: orderId,
    name, email, phone, address, items, total,
    date: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    status: 'confirmed'
  };

  const itemsHtml = items.map(i =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;font-size:14px;color:#3a2a1a;">${i.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;font-size:14px;color:#3a2a1a;text-align:center;">${i.size}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;font-size:14px;color:#3a2a1a;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e0d0;font-size:14px;color:#3a2a1a;text-align:right;">Rs. ${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`
  ).join('');

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia','Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:30px 10px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px 40px;text-align:center;">
            <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:700;letter-spacing:2px;">THE YUSUF STORE</h1>
            <p style="color:#a89070;margin:6px 0 0;font-size:13px;letter-spacing:1px;">ORDER CONFIRMATION</p>
          </td>
        </tr>
        <tr><td style="padding:35px 40px 20px;">
          <p style="font-size:16px;color:#3a2a1a;margin:0 0 6px;">Dear <strong style="color:#1a1a2e;">${name}</strong>,</p>
          <p style="font-size:15px;color:#5a4a3a;margin:0 0 20px;line-height:1.6;">Thank you for your order at <strong>The Yusuf Store</strong>. Your order has been confirmed and will be dispatched shortly.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0;border-radius:6px;padding:18px 20px;margin-bottom:24px;">
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Order ID</td><td style="font-size:14px;color:#1a1a2e;font-weight:700;text-align:right;padding:3px 0;">${orderId}</td></tr>
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Date</td><td style="font-size:14px;color:#3a2a1a;text-align:right;padding:3px 0;">${order.date}</td></tr>
            <tr><td style="font-size:13px;color:#8a7a6a;padding:3px 0;">Status</td><td style="font-size:14px;color:#2d8a4e;font-weight:600;text-align:right;padding:3px 0;">Confirmed</td></tr>
          </table>

          <h3 style="color:#1a1a2e;font-size:16px;margin:0 0 10px;letter-spacing:0.5px;">Order Summary</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#1a1a2e;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">Item</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">Size</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">Subtotal</th>
            </tr>
            ${itemsHtml}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            <tr>
              <td style="font-size:16px;color:#1a1a2e;font-weight:700;padding:8px 12px;">Total</td>
              <td style="font-size:18px;color:#c9a84c;font-weight:700;text-align:right;padding:8px 12px;">Rs. ${total.toLocaleString()}</td>
            </tr>
          </table>

          <div style="border-top:1px solid #e8e0d0;margin:24px 0 18px;"></div>

          <h3 style="color:#1a1a2e;font-size:15px;margin:0 0 8px;">Delivery Address</h3>
          <p style="font-size:14px;color:#5a4a3a;margin:0 0 4px;line-height:1.5;">${address.replace(/\n/g, '<br>')}</p>
          <p style="font-size:14px;color:#5a4a3a;margin:0 0 20px;">Phone: ${phone}</p>

          <p style="font-size:14px;color:#5a4a3a;margin:0 0 4px;line-height:1.6;">Thank you for shopping with us! We truly appreciate your trust.</p>
          <p style="font-size:14px;color:#5a4a3a;margin:0 0 4px;line-height:1.6;">You will receive a notification once your order is shipped.</p>
          <p style="font-size:14px;color:#5a4a3a;margin:0 0 20px;line-height:1.6;">For further queries, contact us at <strong>0336-8877666</strong> or email <a href="mailto:info@scentsbyyusuf.com" style="color:#c9a84c;text-decoration:none;">info@scentsbyyusuf.com</a>.</p>
        </td></tr>
        <tr>
          <td style="background:#1a1a2e;padding:20px 40px;text-align:center;">
            <p style="color:#a89070;font-size:12px;margin:0 0 4px;letter-spacing:1px;">THE YUSUF STORE</p>
            <p style="color:#6a5a4a;font-size:11px;margin:0;">Premium Perfumes, Watches &amp; Grooming Essentials</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const emailText = `Dear ${name},

Thank you for your order at The Yusuf Store. Your order has been confirmed and will be dispatched shortly.

Order ID: ${orderId}
Date: ${order.date}
Status: Confirmed

Items:
${items.map(i => `  - ${i.name} (${i.size}) x ${i.quantity} = Rs. ${(i.price * i.quantity).toLocaleString()}`).join('\n')}

Total: Rs. ${total.toLocaleString()}

Delivery Address:
${address}

Phone: ${phone}

You will receive a notification once your order is shipped.

If you have any questions, reply to this email or contact us at info@scentsbyyusuf.com.

Best regards,
The Yusuf Store`;

  try {
    await transporter.sendMail({
      from: `"The Yusuf Store" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Order Confirmed - ${orderId} - The Yusuf Store`,
      text: emailText,
      html: emailHtml
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Email send failed:', err.message);
    res.status(500).json({
      error: 'Failed to send confirmation email.',
      details: err.message
    });
  }
};
