// api/admin-auth.js
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://www.tolimolimyanmar.com',
  'https://tolimolimyanmar.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

function applyCors(req, res, methods, headers = 'Content-Type') {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.tolimolimyanmar.com');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { pin } = req.body || {};
  const serverPin = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;

  if (!serverPin) {
    return res.status(500).json({ success: false, error: 'Server Admin PIN is not configured in Vercel Environment Variables' });
  }

  if (pin && String(pin).trim() === String(serverPin).trim()) {
    // PIN ကို Token ထဲ မထည့်ဘဲ HMAC-SHA256 Signed Token ထုတ်ပေးခြင်း
    const ts = String(Date.now());
    const sig = crypto.createHmac('sha256', String(serverPin)).update(ts).digest('hex');
    const sessionToken = `auth_${ts}_${sig}`;
    return res.status(200).json({ success: true, token: sessionToken });
  } else {
    return res.status(401).json({ success: false, error: 'Invalid PIN' });
  }
}
