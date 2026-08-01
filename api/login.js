require('dotenv').config();
const jwt = require('jsonwebtoken');

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

  const { username, password } = req.body || {};

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

  if (!adminUser || !adminPass) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server yet.' });
  }

  const userOk = username && typeof username === 'string' && username === adminUser;
  const passOk = password && typeof password === 'string' && password === adminPass;

  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ role: 'admin', user: username }, secret, { expiresIn: '12h' });

  res.json({ token });
};
