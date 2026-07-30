require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const twilioAvailable = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
let twilioClient = null;
if (twilioAvailable) {
  twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const pendingOrders = new Map();

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/api/send-code', async (req, res) => {
  const { name, phone, address, items, total } = req.body;

  if (!name || !phone || !address || !items || !total) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const code = generateCode();
  const orderId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  pendingOrders.set(orderId, { name, phone, address, items, total, code, verified: false });

  setTimeout(() => {
    const order = pendingOrders.get(orderId);
    if (order && !order.verified) {
      pendingOrders.delete(orderId);
    }
  }, 600000);

  const message = `*The Yusuf Store - Order Verification*\n\nHi ${name},\n\nYour order verification code is: *${code}*\n\nEnter this code on the checkout page to confirm your order.\n\nOrder Summary:\n${items.map(i => `- ${i.name} (${i.size}) x ${i.quantity} = Rs. ${(i.price * i.quantity).toLocaleString()}`).join('\n')}\n\nTotal: Rs. ${total.toLocaleString()}\n\nDelivery Address: ${address}`;

  try {
    if (twilioClient) {
      const fromNumber = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      const toNumber = `whatsapp:${phone.startsWith('+') ? phone : '+92' + phone.replace(/^0/, '')}`;

      await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber
      });
    }

    res.json({
      success: true,
      orderId,
      message: twilioAvailable
        ? 'Verification code sent via WhatsApp!'
        : 'Verification code generated. Use WhatsApp to send it.',
      code: !twilioAvailable ? code : undefined,
      whatsappUrl: `https://wa.me/${phone.startsWith('+') ? phone.replace(/^\+/, '') : '92' + phone.replace(/^0/, '')}?text=${encodeURIComponent('My verification code is: ' + code)}`
    });
  } catch (err) {
    console.error('Failed to send WhatsApp:', err.message);
    pendingOrders.delete(orderId);
    res.status(500).json({ error: 'Failed to send WhatsApp message. Check your Twilio credentials.' });
  }
});

app.post('/api/verify-code', (req, res) => {
  const { orderId, code } = req.body;

  const order = pendingOrders.get(orderId);
  if (!order) {
    return res.status(400).json({ error: 'Order not found or expired. Please place your order again.' });
  }

  if (order.verified) {
    return res.status(400).json({ error: 'This order has already been verified.' });
  }

  if (order.code !== code) {
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
  }

  order.verified = true;

  const orderDetails = {
    id: orderId,
    name: order.name,
    phone: order.phone,
    address: order.address,
    items: order.items,
    total: order.total,
    timestamp: new Date().toISOString()
  };

  if (twilioClient && process.env.STORE_WHATSAPP_NUMBER) {
    const storeMessage = `*New Order Confirmed!*\n\nOrder ID: ${orderId}\nCustomer: ${order.name}\nPhone: ${order.phone}\nAddress: ${order.address}\n\nItems:\n${order.items.map(i => `- ${i.name} (${i.size}) x ${i.quantity} = Rs. ${(i.price * i.quantity).toLocaleString()}`).join('\n')}\n\nTotal: Rs. ${order.total.toLocaleString()}`;

    twilioClient.messages.create({
      body: storeMessage,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${process.env.STORE_WHATSAPP_NUMBER}`
    }).catch(err => console.error('Store notification failed:', err.message));
  }

  res.json({ success: true, order: orderDetails });
});

app.get('/api/order/:id', (req, res) => {
  const order = pendingOrders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ success: true, verified: order.verified });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`The Yusuf Store server running at http://localhost:${PORT}`);
  if (!twilioAvailable) {
    console.log('WhatsApp: Using click-to-chat fallback (configure Twilio for automated sending)');
  } else {
    console.log('WhatsApp: Twilio configured for automated messages');
  }
});
