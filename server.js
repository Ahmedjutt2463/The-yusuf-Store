require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const orders = [];

app.post('/api/place-order', async (req, res) => {
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
    name,
    email,
    phone,
    address,
    items,
    total,
    date: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    status: 'confirmed'
  };

  orders.push(order);

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

If you have any questions, reply to this email or contact us at info@theyusufstore.com.

Best regards,
The Yusuf Store`;

  try {
    await transporter.sendMail({
      from: `"The Yusuf Store" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Order Confirmed - ${orderId} - The Yusuf Store`,
      text: emailBody
    });

    res.json({
      success: true,
      order
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
    res.status(500).json({
      error: 'Failed to send confirmation email. Please check your email configuration in .env',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`The Yusuf Store server running at http://localhost:${PORT}`);
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email: SMTP not configured. Set SMTP_USER and SMTP_PASS in .env');
  } else {
    console.log('Email: Ready to send order confirmations');
  }
});
