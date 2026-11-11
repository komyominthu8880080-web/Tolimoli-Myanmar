// api/admin-auth.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { pin } = req.body;
  const serverPin = process.env.ADMIN_SECRET_PIN || '1542';

  if (pin && String(pin).trim() === String(serverPin).trim()) {
    const sessionToken = 'auth_' + Buffer.from(Date.now() + '_' + serverPin).toString('base64');
    return res.status(200).json({ success: true, token: sessionToken });
  } else {
    return res.status(401).json({ success: false, error: 'Invalid PIN' });
  }
}