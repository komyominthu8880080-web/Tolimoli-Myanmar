// api/products.js
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
  applyCors(req, res, 'GET, PUT, OPTIONS', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FIREBASE_BASE = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';
  const FIREBASE_URL = `${FIREBASE_BASE}/shop_products.json`;

  // ၁။ ပစ္စည်းစာရင်း ဆွဲယူခြင်း (GET)
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
      const response = await fetch(FIREBASE_URL);
      if (!response.ok) throw new Error('Firebase Fetch Failed');
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၂။ ပစ္စည်းစာရင်း ပြင်ဆင်/သိမ်းဆည်းခြင်း (PUT - Admin PIN မဖြစ်မနေ လိုအပ်သည်)
  if (req.method === 'PUT') {
    try {
      const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
      if (!SERVER_ADMIN_PIN) {
        return res.status(500).json({ error: 'Server Admin PIN is not configured' });
      }

      const clientPin = req.headers['x-admin-pin'];
      if (!clientPin || String(clientPin).trim() !== String(SERVER_ADMIN_PIN).trim()) {
        return res.status(401).json({ error: 'Unauthorized: Admin PIN မှားယွင်းနေပါသည်' });
      }

      const updatedProducts = req.body;
      if (!Array.isArray(updatedProducts)) {
        return res.status(400).json({ error: 'Invalid products data format' });
      }

      const response = await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProducts)
      });

      if (!response.ok) throw new Error('Failed to update products');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
