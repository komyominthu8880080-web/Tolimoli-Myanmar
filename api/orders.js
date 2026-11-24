// api/orders.js
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
  applyCors(req, res, 'GET, POST, PUT, OPTIONS', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FIREBASE_BASE_URL = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';

  // ၁။ ဝယ်သူ အော်ဒါအသစ် တင်ခြင်း (POST - ရှိပြီးသား အော်ဒါကို overwrite မလုပ်နိုင်အောင် ကာကွယ်ထားသည်)
  if (req.method === 'POST') {
    try {
      const orderData = req.body;
      if (!orderData || !orderData.id) {
        return res.status(400).json({ error: 'Order data or ID missing' });
      }

      const orderUrl = `${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(orderData.id)}.json`;
      const existingRes = await fetch(orderUrl);
      const existingOrder = existingRes.ok ? await existingRes.json() : null;
      if (existingOrder) {
        return res.status(409).json({ error: 'Order ID already exists' });
      }

      // အော်ဒါအသစ်အတွက် Status ကို Pending အဖြစ် Server မှ အတည်ပြုသတ်မှတ်ခြင်း
      const safeOrder = {
        ...orderData,
        status: 'အော်ဒါလက်ခံရရှိ (Pending)'
      };

      const response = await fetch(orderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeOrder)
      });

      if (!response.ok) throw new Error('Firebase Order Write Failed');
      return res.status(200).json({ success: true, orderId: safeOrder.id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၂။ Admin မှ ရှိပြီးသား အော်ဒါ ပြင်ဆင်ခြင်း (PUT - Admin PIN မဖြစ်မနေ လိုအပ်သည်)
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

      const orderData = req.body;
      if (!orderData || !orderData.id) {
        return res.status(400).json({ error: 'Order data or ID missing' });
      }

      const orderUrl = `${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(orderData.id)}.json`;
      const response = await fetch(orderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Firebase Order Update Failed');
      return res.status(200).json({ success: true, orderId: orderData.id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၃။ အော်ဒါများ ပြန်လည်ဆွဲယူခြင်း (GET)
  if (req.method === 'GET') {
    try {
      const { id } = req.query || {};
      const clientPin = req.headers['x-admin-pin'];

      // (က) Customer Tracking: အော်ဒါ ID သီးသန့်ဖြင့် စစ်ဆေးခြင်း (Object နှင့် Legacy Array ၂ မျိုးလုံး ပံ့ပိုးသည်)
      if (id) {
        const directRes = await fetch(`${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(id)}.json`);
        let data = directRes.ok ? await directRes.json() : null;

        if (!data) {
          const allRes = await fetch(`${FIREBASE_BASE_URL}/shop_orders.json`);
          const allData = allRes.ok ? await allRes.json() : null;
          if (allData) {
            const list = Array.isArray(allData) ? allData : Object.values(allData);
            data = list.find(o => o && String(o.id).toLowerCase() === String(id).toLowerCase()) || null;
          }
        }
        return res.status(200).json(data);
      }

      // (ခ) Admin Dashboard: အော်ဒါအားလုံး ဆွဲထုတ်ခြင်း (Header x-admin-pin မဖြစ်မနေ လိုအပ်သည်)
      const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
      if (!SERVER_ADMIN_PIN) {
        return res.status(500).json({ error: 'Server Admin PIN is not configured' });
      }

      if (!clientPin || String(clientPin).trim() !== String(SERVER_ADMIN_PIN).trim()) {
        return res.status(401).json({ error: 'Unauthorized: လျှို့ဝှက် Admin PIN မှားယွင်းနေပါသည်' });
      }

      const response = await fetch(`${FIREBASE_BASE_URL}/shop_orders.json`);
      if (!response.ok) throw new Error('Failed to fetch all orders');
      const data = await response.json();

      let ordersArray = [];
      if (data) {
        ordersArray = Array.isArray(data)
          ? data.filter(Boolean)
          : Object.keys(data).map(k => ({ id: k, ...data[k] }));
      }
      return res.status(200).json(ordersArray);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
