require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
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

  const itemsList = items.map(i =>
    `    - ${i.name} (${i.size}) x ${i.quantity} = Rs. ${(i.price * i.quantity).toLocaleString()}`
  ).join('\n');

  const emailBody = `Dear ${name},

Thank you for shopping at The Yusuf Store!

Your order has been confirmed and will be dispatched soon.

━━━━━━━━━━━━━━━━━━━━━━━━━
Order Details
━━━━━━━━━━━━━━━━━━━━━━━━━

Order ID: ${orderId}
Date: ${order.date}

Items:
${itemsList}

Total: Rs. ${total.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━

Delivery Address:
${address}

Contact: ${phone}

━━━━━━━━━━━━━━━━━━━━━━━━━

We will notify you once your order is shipped.

If you have any questions, reply to this email or contact us at info@scentsbyyusuf.com.

Best regards,
The Yusuf Store`;

  try {
    await transporter.sendMail({
      from: `"The Yusuf Store" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Order Confirmed - ${orderId} - The Yusuf Store`,
      text: emailBody
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
