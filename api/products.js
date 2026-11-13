// api/products.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

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

  // ၂။ ပစ္စည်းစာရင်း အသစ်သိမ်းဆည်းခြင်း / Stock လျှော့ချခြင်း (PUT)
  if (req.method === 'PUT') {
    try {
      const clientPin = req.headers['x-admin-pin'];
      const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN || '1542';

      // Admin Dashboard မှ ပြင်ဆင်မှုဖြစ်ပါက (x-admin-pin ပါလာပါက) PIN ကိုက်ညီမှု စစ်ဆေးခြင်း
      if (clientPin && String(clientPin).trim() !== String(SERVER_ADMIN_PIN).trim()) {
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

      if (!response.ok) throw new Error('Failed to update products stock');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}